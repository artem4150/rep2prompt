package worker

import (
	"context"

	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// ExportSink — абстракция, которую использует раннер.
// ExportsMem ЕЁ уже реализует (методами UpdateStatus/AddArtifact/IsCancelRequested).
// Здесь мы сделаем адаптер к Postgres-репозиторию, чтобы воркер мог работать без in-memory.
type ExportSink interface {
	UpdateStatus(id string, st jobs.Status, progress int, failureReason *string)
	AddArtifact(id string, art store.ArtifactMeta)
	IsCancelRequested(id string) bool
}

// PgExportsAdapter — адаптер поверх store.ExportsRepo (Postgres).
type PgExportsAdapter struct {
	Repo store.ExportsRepo
}

func (a *PgExportsAdapter) UpdateStatus(id string, st jobs.Status, progress int, failureReason *string) {
	_ = a.Repo.UpdateStatus(context.Background(), id, st, progress, failureReason)
}

func (a *PgExportsAdapter) AddArtifact(id string, art store.ArtifactMeta) {
	_ = a.Repo.AddArtifact(context.Background(), id, art)
}

func (a *PgExportsAdapter) IsCancelRequested(id string) bool {
	v, err := a.Repo.IsCancelRequested(context.Background(), id)
	return err == nil && v
}
