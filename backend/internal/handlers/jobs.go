package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/yourname/cleanhttp/internal/httputil"
	"github.com/yourname/cleanhttp/internal/jobs"
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
		resp := jobStatusResponse(exp)
		httputil.WriteJSON(w, http.StatusOK, resp)
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
	if !h.Exports.RequestCancel(id) {
		httputil.WriteError(w, http.StatusConflict, "conflict", "job already finished or not found", nil)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// JobEventsHandler — SSE стрим обновлений статуса.
type JobEventsHandler struct {
	Exports *store.ExportsMem
	Logger  *slog.Logger
}

func (h *JobEventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET", nil)
		return
	}
	if r.Header.Get("Accept") != "text/event-stream" {
		// Не обязательно, но помогает дебагу.
	}
	id := strings.TrimPrefix(r.URL.Path, "/jobs/")
	id = strings.TrimSuffix(id, "/events")
	if id == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "missing id", nil)
		return
	}
	exp, ok := h.Exports.Get(id)
	if !ok {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "job not found", nil)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		httputil.WriteError(w, http.StatusInternalServerError, "stream_not_supported", "streaming not supported", nil)
		return
	}

	ctx := r.Context()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Отправляем стартовое состояние
	if err := writeSSE(w, flusher, exp); err != nil {
		if h.Logger != nil {
			h.Logger.Error("sse initial send failed", slog.String("exportId", id), slog.String("error", err.Error()))
		}
		return
	}

	ch, unsubscribe, ok := h.Exports.Subscribe(id)
	if !ok {
		httputil.WriteError(w, http.StatusNotFound, "not_found", "job not found", nil)
		return
	}
	defer unsubscribe()

	for {
		select {
		case <-ctx.Done():
			return
		case snap, more := <-ch:
			if !more {
				return
			}
			if err := writeSSE(w, flusher, snap); err != nil {
				if h.Logger != nil {
					h.Logger.Error("sse send failed", slog.String("exportId", id), slog.String("error", err.Error()))
				}
				return
			}
			if isTerminalState(snap.Status) {
				return
			}
		}
	}
}

func writeSSE(w http.ResponseWriter, flusher http.Flusher, data any) error {
	payload := jobStatusResponseFromSnapshot(data)
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte("data: ")); err != nil {
		return err
	}
	if _, err := w.Write(b); err != nil {
		return err
	}
	if _, err := w.Write([]byte("\n\n")); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

func jobStatusResponse(exp *store.Export) map[string]any {
	return map[string]any{
		"state":           string(exp.Status),
		"progress":        exp.Progress,
		"failureReason":   exp.FailureReason,
		"error":           exp.FailureReason,
		"cancelRequested": exp.CancelRequested,
		"exportId":        exp.ID,
		"artifacts":       exp.Artifacts,
	}
}

func jobStatusResponseFromSnapshot(v any) map[string]any {
	switch data := v.(type) {
	case *store.Export:
		return jobStatusResponse(data)
	case store.ExportSnapshot:
		return map[string]any{
			"state":           string(data.Status),
			"progress":        data.Progress,
			"failureReason":   data.FailureReason,
			"error":           data.FailureReason,
			"cancelRequested": data.CancelRequested,
			"exportId":        data.ID,
			"artifacts":       data.Artifacts,
		}
	default:
		return map[string]any{}
	}
}

func isTerminalState(st jobs.Status) bool {
	return st == jobs.StatusDone || st == jobs.StatusError || st == jobs.StatusCancelled
}
