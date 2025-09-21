package handlers

import (
	"bytes"
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/filters"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/httputil"
)

// PreviewHandler — отдаёт первые N КБ текстового файла.
type PreviewHandler struct {
	GH *githubclient.Client
}

// NewPreviewHandler — простой конструктор.
func NewPreviewHandler(gh *githubclient.Client) *PreviewHandler {
	return &PreviewHandler{GH: gh}
}

// previewReq — тело запроса.
type previewReq struct {
	Owner string `json:"owner"`
	Repo  string `json:"repo"`
	Ref   string `json:"ref"`
	Path  string `json:"path"`
	MaxKB int    `json:"maxKB"` // максимум, сколько прочесть (килоБАЙТ)
}

// previewResp — тело ответа.
type previewResp struct {
	Content   string `json:"content"`
	Truncated bool   `json:"truncated"`
}

// ServeHTTP — POST /api/preview
func (h *PreviewHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST is allowed", nil)
		return
	}

	var in previewReq
	if err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid JSON body", map[string]any{"error": err.Error()})
		return
	}

	// Валидация и нормализация.
	if in.Owner == "" || in.Repo == "" || in.Path == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "owner, repo, path are required", nil)
		return
	}
	if in.Ref == "" {
		in.Ref = "main"
	}
	np, err := filters.NormalizeRel(in.Path)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid path", map[string]any{"error": err.Error()})
		return
	}
	maxKB := in.MaxKB
	if maxKB <= 0 {
		maxKB = 256
	}
	maxBytes := int64(maxKB) * 1024

	// Таймаут на внешний сетевой вызов.
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	// Качаем сырой файл.
	data, truncated, err := h.GH.GetRawFile(ctx, in.Owner, in.Repo, np, in.Ref, maxBytes)
	if err != nil {
		if rl, ok := err.(*githubclient.RateLimitedError); ok {
			httputil.WriteError(w, http.StatusTooManyRequests, "rate_limited", "GitHub API rate limited", map[string]any{"reset": rl.Reset})
			return
		}
		if err == githubclient.ErrNotFound {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "file not found", nil)
			return
		}
		if err == githubclient.ErrUpstream {
			httputil.WriteError(w, http.StatusBadGateway, "upstream_error", "GitHub upstream error", nil)
			return
		}
		if err == githubclient.ErrTooLarge {
			httputil.WriteError(w, http.StatusRequestEntityTooLarge, "too_large", "file is larger than requested preview limit", map[string]any{"maxKB": maxKB})
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "internal error", map[string]any{"error": err.Error()})
		return
	}

	// Проверим «бинарность» по сэмплу.
	sample := data
	if len(sample) > 4096 {
		sample = sample[:4096]
	}
	if filters.IsBinarySample(sample) {
		httputil.WriteError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "binary files are not previewable", nil)
		return
	}

	// Гарантируем валидный UTF-8 и нормализуем переводы строк.
	txt := bytes.ToValidUTF8(data, []byte("�"))
	s := string(txt)
	s = strings.ReplaceAll(s, "\r\n", "\n") // CRLF → LF
	s = strings.ReplaceAll(s, "\r", "\n")   // голые CR → LF

	httputil.WriteJSON(w, http.StatusOK, previewResp{
		Content:   s,
		Truncated: truncated,
	})
}
