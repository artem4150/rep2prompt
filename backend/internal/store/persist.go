package store

import (
	"context"

	"github.com/yourname/cleanhttp/internal/jobs"
)

type ExportsRepo interface {
	CreateOrReuse(ctx context.Context, exp *Export) (*Export, bool, error)
	GetByID(ctx context.Context, id string) (*Export, bool, error)
	UpdateStatus(ctx context.Context, id string, st jobs.Status, progress int, failureReason *string) error
	AddArtifact(ctx context.Context, exportID string, art ArtifactMeta) error
	RequestCancel(ctx context.Context, id string) (bool, error)
	IsCancelRequested(ctx context.Context, id string) (bool, error)
}
