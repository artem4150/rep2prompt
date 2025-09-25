package handlers

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/httputil"
)

// DownloadHandler — GET /api/download/:artifactId → отдаёт файл (стримом).
type DownloadHandler struct {
	Store artifacts.ArtifactsStore
}

func NewDownloadHandler(st artifacts.ArtifactsStore) *DownloadHandler {
	return &DownloadHandler{Store: st}
}

func (h *DownloadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET is allowed", nil)
		return
	}

	// После http.StripPrefix("/download", ...) здесь будет "/<artifactId>"
	rest := strings.TrimPrefix(r.URL.Path, "/")
	if i := strings.IndexByte(rest, '/'); i >= 0 {
		rest = rest[:i]
	}
	if rest == "" || !h.Store.IsSafeID(rest) {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid artifact id", nil)
		return
	}

	f, meta, _, err := h.Store.OpenByArtifactID(rest)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "artifact not found", nil)
		return
	}
	defer f.Close()

	ct := artifacts.DetectContentType(meta.Name)
	w.Header().Set("Content-Type", ct)
	if meta.Size > 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(meta.Size, 10))
	}
	w.Header().Set("Content-Disposition", `attachment; filename="`+filepath.Base(meta.Name)+`"`)
	w.Header().Set("Cache-Control", "private, max-age=0")
	w.WriteHeader(http.StatusOK)
	_, _ = artifacts.StreamCopy(w, f)
}
