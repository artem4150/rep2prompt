package store

import (
	"context"
	"log/slog"
	"strings"
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
	Format          string // zip|txt|promptpack (md legacy alias)
	IdempotencyKey  string
}

// ArtifactMeta — метаданные артефакта (совместимы с FS/S3 и PG)
type ArtifactMeta struct {
	Name        string         // имя файла (видимое пользователю)
	Path        string         // относительный путь в сторадже (fs/s3)
	ContentType string         // MIME
	Size        int64          // байты
	Checksum    string         // sha256 и т.п.
	Meta        map[string]any // произвольные метаданные manifest'а

	// опционально — если где-то использовались
	ID   string
	Kind string
}

// Export — запись экспорта
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

// ВАЖНО: интерфейс ExportsRepo объявлён в persist.go

type ExportsMem struct {
	mu        sync.RWMutex
	byID      map[string]*Export
	byIdem    map[string]string // idemKey → exportID
	genSeq    int64
	idPrefix  string
	listeners map[string]map[int]chan ExportSnapshot
	nextSubID int

	repo        ExportsRepo // может быть nil: тогда просто in-memory
	syncStarted bool
}

func NewExportsMem(prefix string) *ExportsMem {
	return &ExportsMem{
		byID:      make(map[string]*Export),
		byIdem:    make(map[string]string),
		idPrefix:  prefix,
		listeners: make(map[string]map[int]chan ExportSnapshot),
	}
}

func NewExportsMemWithRepo(prefix string, repo ExportsRepo) *ExportsMem {
	s := NewExportsMem(prefix)
	s.repo = repo
	return s
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

func (s *ExportsMem) CreateOrReuse(owner, repo, ref string, opts ExportOptions) (*Export, bool) {
	key := strings.TrimSpace(opts.IdempotencyKey)

	s.mu.Lock()
	if key != "" {
		if id, ok := s.byIdem[key]; ok {
			e := s.byID[id]
			s.mu.Unlock()
			return e, true
		}
	}

	id := s.genID()
	if key == "" {
		key = id
	}
	opts.IdempotencyKey = key

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
	s.byIdem[key] = id
	s.mu.Unlock()

	// write-through → PG
	if s.repo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if _, _, err := s.repo.CreateOrReuse(ctx, e); err != nil {
			slog.Warn("pg CreateOrReuse failed",
				slog.String("export_id", e.ID),
				slog.String("error", err.Error()))
		}
	}
	return e, false
}

func (s *ExportsMem) Get(id string) (*Export, bool) {
	if exp, ok := s.syncFromRepo(id); ok {
		return exp, true
	}
	s.mu.RLock()
	e, ok := s.byID[id]
	s.mu.RUnlock()
	return e, ok
}

func (s *ExportsMem) UpdateStatus(id string, st jobs.Status, progress int, failureReason *string) {
	var snap ExportSnapshot
	var listeners []chan ExportSnapshot

	s.mu.Lock()
	if e, ok := s.byID[id]; ok {
		prevProgress := e.Progress
		e.Status = st
		if progress >= 0 {
			switch st {
			case jobs.StatusError, jobs.StatusCancelled:
				if progress >= prevProgress {
					e.Progress = progress
				}
			default:
				e.Progress = progress
			}
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

	if s.repo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := s.repo.UpdateStatus(ctx, id, st, progress, failureReason); err != nil {
			slog.Warn("pg UpdateStatus failed",
				slog.String("export_id", id),
				slog.String("error", err.Error()))
		}
	}

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

	if s.repo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := s.repo.AddArtifact(ctx, id, art); err != nil {
			slog.Warn("pg AddArtifact failed",
				slog.String("export_id", id),
				slog.String("error", err.Error()))
		}
	}

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

	if updated && s.repo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if ok, err := s.repo.RequestCancel(ctx, id); err != nil {
			slog.Warn("pg RequestCancel failed",
				slog.String("export_id", id),
				slog.String("error", err.Error()))
		} else if !ok {
			// возможно уже помечен
		}
	}

	if updated {
		s.dispatch(listeners, snap)
	}
	return updated
}

func (s *ExportsMem) IsCancelRequested(id string) bool {
	s.mu.RLock()
	if e, ok := s.byID[id]; ok {
		if e.CancelRequested {
			s.mu.RUnlock()
			return true
		}
	}
	s.mu.RUnlock()

	if s.repo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if v, err := s.repo.IsCancelRequested(ctx, id); err == nil && v {
			return true
		}
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
		}
	}
}

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

// StartSync запускает фоновые опросы репозитория и синхронизирует статусы
// экспортов, если хранилище обернуто поверх Postgres.
func (s *ExportsMem) StartSync(ctx context.Context, interval time.Duration) {
	if s.repo == nil || interval <= 0 {
		return
	}
	s.mu.Lock()
	if s.syncStarted {
		s.mu.Unlock()
		return
	}
	s.syncStarted = true
	s.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				ids := s.activeExportIDs()
				for _, id := range ids {
					s.syncFromRepo(id)
				}
			}
		}
	}()
}

func (s *ExportsMem) activeExportIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.byID) == 0 {
		return nil
	}
	ids := make([]string, 0, len(s.byID))
	for id, exp := range s.byID {
		if !isTerminal(exp.Status) {
			ids = append(ids, id)
		}
	}
	return ids
}

func (s *ExportsMem) syncFromRepo(id string) (*Export, bool) {
	if s.repo == nil {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	exp, ok, err := s.repo.GetByID(ctx, id)
	if err != nil || !ok {
		return nil, false
	}

	var (
		listeners []chan ExportSnapshot
		snap      ExportSnapshot
		result    *Export
	)

	s.mu.Lock()
	if local, exists := s.byID[id]; exists {
		changed := updateExportLocked(local, exp)
		result = local
		if changed {
			snap = snapshotLocked(local)
			listeners = s.collectListenersLocked(id)
		}
	} else {
		cloned := cloneExport(exp)
		s.byID[id] = cloned
		if cloned.Options.IdempotencyKey != "" {
			if s.byIdem == nil {
				s.byIdem = make(map[string]string)
			}
			s.byIdem[cloned.Options.IdempotencyKey] = cloned.ID
		}
		result = cloned
		snap = snapshotLocked(cloned)
		listeners = s.collectListenersLocked(id)
	}
	s.mu.Unlock()

	if len(listeners) > 0 {
		s.dispatch(listeners, snap)
	}
	return result, true
}

func updateExportLocked(dst, src *Export) bool {
	changed := false
	if dst.Status != src.Status {
		dst.Status = src.Status
		changed = true
	}
	if dst.Progress != src.Progress {
		dst.Progress = src.Progress
		changed = true
	}
	if !equalStringPtr(dst.FailureReason, src.FailureReason) {
		dst.FailureReason = copyStringPtr(src.FailureReason)
		changed = true
	}
	if dst.CancelRequested != src.CancelRequested {
		dst.CancelRequested = src.CancelRequested
		changed = true
	}
	if !equalTimePtr(dst.StartedAt, src.StartedAt) {
		dst.StartedAt = copyTimePtr(src.StartedAt)
		changed = true
	}
	if !equalTimePtr(dst.FinishedAt, src.FinishedAt) {
		dst.FinishedAt = copyTimePtr(src.FinishedAt)
		changed = true
	}
	if len(src.Artifacts) > 0 {
		if len(dst.Artifacts) != len(src.Artifacts) {
			dst.Artifacts = append([]ArtifactMeta(nil), src.Artifacts...)
			changed = true
		}
	}
	return changed
}

func cloneExport(src *Export) *Export {
	cloned := *src
	cloned.FailureReason = copyStringPtr(src.FailureReason)
	cloned.StartedAt = copyTimePtr(src.StartedAt)
	cloned.FinishedAt = copyTimePtr(src.FinishedAt)
	if len(src.Artifacts) > 0 {
		cloned.Artifacts = append([]ArtifactMeta(nil), src.Artifacts...)
	}
	return &cloned
}

func equalStringPtr(a, b *string) bool {
	switch {
	case a == nil && b == nil:
		return true
	case a == nil || b == nil:
		return false
	default:
		return *a == *b
	}
}

func equalTimePtr(a, b *time.Time) bool {
	switch {
	case a == nil && b == nil:
		return true
	case a == nil || b == nil:
		return false
	default:
		return a.Equal(*b)
	}
}

func copyStringPtr(src *string) *string {
	if src == nil {
		return nil
	}
	v := *src
	return &v
}

func copyTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	v := *src
	return &v
}
