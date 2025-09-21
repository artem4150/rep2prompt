package handlers

import (
	"net/http"
	"strings"

	"github.com/yourname/cleanhttp/internal/httputil"
	_"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// JobStatusHandler — GET /api/jobs/:id
type JobStatusHandler struct {
	Exports *store.ExportsMem
}

func (h *JobStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET", nil)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/jobs/")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "missing id", nil)
		return
	}
	if exp, ok := h.Exports.Get(id); ok {
		type resp struct {
			State     string                 `json:"state"`
			Progress  int                    `json:"progress"`
			Error     *string                `json:"error"`
			ExportID  string                 `json:"exportId"`
			Artifacts []store.ArtifactMeta   `json:"artifacts"`
		}
		httputil.WriteJSON(w, http.StatusOK, resp{
			State:     string(exp.Status),
			Progress:  exp.Progress,
			Error:     exp.ErrorText,
			ExportID:  exp.ID,
			Artifacts: exp.Artifacts,
		})
		return
	}
	httputil.WriteError(w, http.StatusNotFound, "not_found", "job not found", nil)
}

// JobCancelHandler — POST /api/jobs/:id/cancel
type JobCancelHandler struct {
	Exports *store.ExportsMem
}

func (h *JobCancelHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST", nil)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/jobs/")
	id = strings.TrimSuffix(id, "/cancel")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "missing id", nil)
		return
	}
	ok := h.Exports.RequestCancel(id)
	if !ok {
		httputil.WriteError(w, http.StatusConflict, "conflict", "job already finished or not found", nil)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}
