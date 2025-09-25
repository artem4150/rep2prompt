package store

import "github.com/yourname/cleanhttp/internal/jobs"

// ExportsStore описывает поведение хранилища экспортов.
type ExportsStore interface {
	CreateOrReuse(owner, repo, ref string, opts ExportOptions) (*Export, bool)
	Get(id string) (*Export, bool)
	UpdateStatus(id string, st jobs.Status, progress int, failureReason *string)
	SetProgress(id string, progress int)
	AddArtifact(id string, art ArtifactMeta)
	RequestCancel(id string) bool
	IsCancelRequested(id string) bool
	Subscribe(id string) (<-chan ExportSnapshot, func(), bool)
}
