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

	Status    jobs.Status
	Progress  int
	ErrorText *string

	CancelRequested bool

	Artifacts  []ArtifactMeta
	CreatedAt  time.Time
	StartedAt  *time.Time
	FinishedAt *time.Time
}

// ExportsMem — потокобезопасное in-memory хранилище (MVP).
type ExportsMem struct {
	mu       sync.RWMutex
	byID     map[string]*Export
	byIdem   map[string]string // idemKey → exportID
	genSeq   int64
	idPrefix string
}

func NewExportsMem(prefix string) *ExportsMem {
	return &ExportsMem{
		byID:     make(map[string]*Export),
		byIdem:   make(map[string]string),
		idPrefix: prefix,
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

func (s *ExportsMem) UpdateStatus(id string, st jobs.Status, progress int, errText *string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if e, ok := s.byID[id]; ok {
		e.Status = st
		if progress >= 0 {
			e.Progress = progress
		}
		// обновляем текст ошибки: если передали nil — очищаем прошлое сообщение
		e.ErrorText = errText
		now := time.Now().UTC()
		switch st {
		case jobs.StatusRunning:
			if e.StartedAt == nil {
				e.StartedAt = &now
			}
		case jobs.StatusDone, jobs.StatusError, jobs.StatusTimeout, jobs.StatusCanceled:
			e.FinishedAt = &now
		}
	}
}

func (s *ExportsMem) SetProgress(id string, progress int) {
	s.UpdateStatus(id, jobs.StatusRunning, progress, nil)
}

func (s *ExportsMem) AddArtifact(id string, art ArtifactMeta) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if e, ok := s.byID[id]; ok {
		e.Artifacts = append(e.Artifacts, art)
	}
}

func (s *ExportsMem) RequestCancel(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if e, ok := s.byID[id]; ok {
		if isTerminal(e.Status) {
			return false
		}
		e.CancelRequested = true
		return true
	}
	return false
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
	case jobs.StatusDone, jobs.StatusError, jobs.StatusTimeout, jobs.StatusCanceled:
		return true
	default:
		return false
	}
}
