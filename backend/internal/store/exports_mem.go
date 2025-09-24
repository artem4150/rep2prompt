package store

import (
	"sync"
	"time"

	"github.com/yourname/cleanhttp/internal/jobs"
)

// ExportOptions — то, что кладём в JSONB (MVP как поля).
type ExportOptions struct {
	IncludeGlobs    []string
	ExcludeGlobs    []string
	SecretScan      bool
	SecretStrategy  string
	TokenModel      string
	TTLHours        int
	MaxBinarySizeMB int
	Profile         string // short|full|rag
	Format          string // zip|md|txt
	IdempotencyKey  string
}

type ArtifactMeta struct {
	ID   string
	Kind string
	Size int64
}

// Export — запись «в БД».
type Export struct {
	ID        string
	UserID    string
	ProjectID string
	Owner     string
	Repo      string
	Ref       string

	Options ExportOptions

	Status        jobs.Status
	Progress      int
	FailureReason *string

	CancelRequested bool

	Artifacts  []ArtifactMeta
	CreatedAt  time.Time
	StartedAt  *time.Time
	FinishedAt *time.Time
}

// ExportSnapshot — срез состояния для отдачи наружу (API, SSE).
type ExportSnapshot struct {
	ID              string
	Status          jobs.Status
	Progress        int
	FailureReason   *string
	CancelRequested bool
	Artifacts       []ArtifactMeta
	CreatedAt       time.Time
	StartedAt       *time.Time
	FinishedAt      *time.Time
}

// ExportsMem — потокобезопасное in-memory хранилище (MVP).
type ExportsMem struct {
	mu        sync.RWMutex
	byID      map[string]*Export
	byIdem    map[string]string // idemKey → exportID
	genSeq    int64
	idPrefix  string
	listeners map[string]map[int]chan ExportSnapshot
	nextSubID int
}

func NewExportsMem(prefix string) *ExportsMem {
	return &ExportsMem{
		byID:      make(map[string]*Export),
		byIdem:    make(map[string]string),
		idPrefix:  prefix,
		listeners: make(map[string]map[int]chan ExportSnapshot),
	}
}

func (s *ExportsMem) genID() string {
	s.genSeq++
	return s.idPrefix + "_" + time.Now().UTC().Format("20060102T150405") + "_" + itoa(s.genSeq)
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	var b [32]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

// CreateOrReuse — идемпотентная вставка по idemKey.
func (s *ExportsMem) CreateOrReuse(owner, repo, ref string, opts ExportOptions) (exp *Export, reused bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if id, ok := s.byIdem[opts.IdempotencyKey]; ok {
		return s.byID[id], true
	}
	id := s.genID()
	now := time.Now().UTC()
	e := &Export{
		ID:        id,
		Owner:     owner,
		Repo:      repo,
		Ref:       ref,
		Options:   opts,
		Status:    jobs.StatusQueued,
		Progress:  0,
		CreatedAt: now,
	}
	s.byID[id] = e
	s.byIdem[opts.IdempotencyKey] = id
	return e, false
}

func (s *ExportsMem) Get(id string) (*Export, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.byID[id]
	return e, ok
}

func (s *ExportsMem) UpdateStatus(id string, st jobs.Status, progress int, failureReason *string) {
	var snap ExportSnapshot
	var listeners []chan ExportSnapshot

	s.mu.Lock()
	if e, ok := s.byID[id]; ok {
		e.Status = st
		if progress >= 0 {
			e.Progress = progress
		}
		e.FailureReason = failureReason
		now := time.Now().UTC()
		switch st {
		case jobs.StatusRunning:
			if e.StartedAt == nil {
				e.StartedAt = &now
			}
		case jobs.StatusDone, jobs.StatusError, jobs.StatusCancelled:
			e.FinishedAt = &now
		}
		snap = snapshotLocked(e)
		listeners = s.collectListenersLocked(id)
	}
	s.mu.Unlock()

	s.dispatch(listeners, snap)
}

func (s *ExportsMem) SetProgress(id string, progress int) {
	s.UpdateStatus(id, jobs.StatusRunning, progress, nil)
}

func (s *ExportsMem) AddArtifact(id string, art ArtifactMeta) {
	var snap ExportSnapshot
	var listeners []chan ExportSnapshot

	s.mu.Lock()
	if e, ok := s.byID[id]; ok {
		e.Artifacts = append(e.Artifacts, art)
		snap = snapshotLocked(e)
		listeners = s.collectListenersLocked(id)
	}
	s.mu.Unlock()

	s.dispatch(listeners, snap)
}

func (s *ExportsMem) RequestCancel(id string) bool {
	var (
		updated   bool
		snap      ExportSnapshot
		listeners []chan ExportSnapshot
	)

	s.mu.Lock()
	if e, ok := s.byID[id]; ok {
		if !isTerminal(e.Status) {
			e.CancelRequested = true
			updated = true
			snap = snapshotLocked(e)
			listeners = s.collectListenersLocked(id)
		}
	}
	s.mu.Unlock()

	if updated {
		s.dispatch(listeners, snap)
	}
	return updated
}

func (s *ExportsMem) IsCancelRequested(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if e, ok := s.byID[id]; ok {
		return e.CancelRequested
	}
	return false
}

func isTerminal(st jobs.Status) bool {
	switch st {
	case jobs.StatusDone, jobs.StatusError, jobs.StatusCancelled:
		return true
	default:
		return false
	}
}

func snapshotLocked(e *Export) ExportSnapshot {
	snap := ExportSnapshot{
		ID:              e.ID,
		Status:          e.Status,
		Progress:        e.Progress,
		FailureReason:   e.FailureReason,
		CancelRequested: e.CancelRequested,
		CreatedAt:       e.CreatedAt,
		StartedAt:       e.StartedAt,
		FinishedAt:      e.FinishedAt,
	}
	if len(e.Artifacts) > 0 {
		snap.Artifacts = make([]ArtifactMeta, len(e.Artifacts))
		copy(snap.Artifacts, e.Artifacts)
	}
	return snap
}

func (s *ExportsMem) collectListenersLocked(id string) []chan ExportSnapshot {
	subs := s.listeners[id]
	if len(subs) == 0 {
		return nil
	}
	out := make([]chan ExportSnapshot, 0, len(subs))
	for _, ch := range subs {
		out = append(out, ch)
	}
	return out
}

func (s *ExportsMem) dispatch(listeners []chan ExportSnapshot, snap ExportSnapshot) {
	if len(listeners) == 0 {
		return
	}
	for _, ch := range listeners {
		select {
		case ch <- snap:
		default:
			// если потребитель не успевает — пропускаем обновление
		}
	}
}

// Subscribe возвращает канал с обновлениями статуса. Второй возвращаемый аргумент — функция отписки.
func (s *ExportsMem) Subscribe(id string) (<-chan ExportSnapshot, func(), bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.byID[id]; !ok {
		return nil, nil, false
	}
	s.nextSubID++
	subID := s.nextSubID
	ch := make(chan ExportSnapshot, 8)
	if s.listeners[id] == nil {
		s.listeners[id] = make(map[int]chan ExportSnapshot)
	}
	s.listeners[id][subID] = ch
	unsubscribe := func() {
		s.mu.Lock()
		if subs, ok := s.listeners[id]; ok {
			if ch, ok := subs[subID]; ok {
				delete(subs, subID)
				close(ch)
				if len(subs) == 0 {
					delete(s.listeners, id)
				}
			}
		}
		s.mu.Unlock()
	}
	return ch, unsubscribe, true
}
