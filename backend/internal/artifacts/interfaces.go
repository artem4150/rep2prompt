package artifacts

import (
	"os"
	"time"
)

// ArtifactsStore описывает хранилище артефактов экспорта.
type ArtifactsStore interface {
	IsSafeID(id string) bool
	CreateArtifact(exportID, kind, name string) (*ArtifactWriter, ArtifactMeta, error)
	OpenByArtifactID(artifactID string) (*os.File, ArtifactMeta, string, error)
	ListByExportID(exportID string) ([]ArtifactMeta, time.Time, error)
}
