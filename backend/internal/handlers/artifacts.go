package handlers

import (
	"errors"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/httputil"
)

// ArtifactsListHandler — GET /api/artifacts/:exportId → список файлов + expiresAt.
type ArtifactsListHandler struct {
	Store artifacts.ArtifactsStore
}

func lastPathSegment(p string) string {
	// Нормализуем и берём последний сегмент пути
	p = "/" + strings.TrimLeft(p, "/")
	seg := path.Base(path.Clean(p))
	// Если путь закончился на /artifacts/ без ID — вернём пустую строку
	if seg == "artifacts" || seg == "." || seg == "/" {
		return ""
	}
	return seg
}

func (h *ArtifactsListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET", nil)
		return
	}

	exportID := lastPathSegment(r.URL.Path)
	if exportID == "" || !h.Store.IsSafeID(exportID) {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid exportId", nil)
		return
	}

	files, expAt, err := h.Store.ListByExportID(exportID)
	if err != nil {
		if errors.Is(err, artifacts.ErrNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "export not found", nil)
		} else {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "cannot list artifacts", nil)
		}
		return
	}

	type resp struct {
		Files     []artifacts.ArtifactMeta `json:"files"`
		ExpiresAt time.Time                `json:"expiresAt"`
	}
	httputil.WriteJSON(w, http.StatusOK, resp{Files: files, ExpiresAt: expAt})
}
