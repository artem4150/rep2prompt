package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/httputil"
)

// ArtifactsListHandler — GET /api/artifacts/:exportId → список файлов + expiresAt.
type ArtifactsListHandler struct {
	Store *artifacts.FSStore
}

func (h *ArtifactsListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET", nil)
		return
	}
	exportID := strings.TrimPrefix(r.URL.Path, "/artifacts/")
	if exportID == "" || !h.Store.IsSafeID(exportID) {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid exportId", nil)
		return
	}
	files, expAt, err := h.Store.ListByExportID(exportID)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "export not found", nil)
		return
	}
	type resp struct {
		Files     []artifacts.ArtifactMeta `json:"files"`
		ExpiresAt time.Time                `json:"expiresAt"`
	}
	httputil.WriteJSON(w, http.StatusOK, resp{Files: files, ExpiresAt: expAt})
}
