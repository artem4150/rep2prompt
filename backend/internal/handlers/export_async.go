package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/hibiken/asynq"

	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/httputil"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

type TaskEnqueuer interface {
	Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error)
}

type ExportAsyncHandler struct {
	Queue   TaskEnqueuer
	Exports store.ExportsStore
	GH      *githubclient.Client
	Logger  *slog.Logger
}

func (h *ExportAsyncHandler) logger() *slog.Logger {
	if h.Logger != nil {
		return h.Logger
	}
	return slog.Default()
}

type exportRequest struct {
	Owner           string   `json:"owner"`
	Repo            string   `json:"repo"`
	Ref             string   `json:"ref"`
	Format          string   `json:"format"`
	Profile         string   `json:"profile"`
	IncludeGlobs    []string `json:"includeGlobs"`
	ExcludeGlobs    []string `json:"excludeGlobs"`
	SecretScan      bool     `json:"secretScan"`
	SecretStrategy  string   `json:"secretStrategy"`
	TokenModel      string   `json:"tokenModel"`
	MaxBinarySizeMB int      `json:"maxBinarySizeMB"`
	TTLHours        int      `json:"ttlHours"`
	IdempotencyKey  string   `json:"idempotencyKey"`
	Priority        string   `json:"priority"` // "high" | "default" | "low"
}

func (h *ExportAsyncHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req exportRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Ref == "" {
		req.Ref = "main"
	}
	format := strings.ToLower(strings.TrimSpace(req.Format))
	if format == "" {
		format = "zip"
	}
	if format == "md" {
		format = "promptpack"
	}
	req.Format = format

	exp, _ := h.Exports.CreateOrReuse(req.Owner, req.Repo, req.Ref, store.ExportOptions{
		IncludeGlobs:    req.IncludeGlobs,
		ExcludeGlobs:    req.ExcludeGlobs,
		SecretScan:      req.SecretScan,
		SecretStrategy:  req.SecretStrategy,
		TokenModel:      req.TokenModel,
		MaxBinarySizeMB: req.MaxBinarySizeMB,
		TTLHours:        req.TTLHours,
		Profile:         req.Profile,
		Format:          req.Format,
		IdempotencyKey:  req.IdempotencyKey,
	})

	queueName := "high"
	switch strings.ToLower(strings.TrimSpace(req.Priority)) {
	case "default":
		queueName = "default"
	case "low":
		queueName = "low"
	case "high":
		queueName = "high"
	}

	payload := struct {
		ExportID        string   `json:"exportId"`
		Owner           string   `json:"owner"`
		Repo            string   `json:"repo"`
		Ref             string   `json:"ref"`
		Format          string   `json:"format"`
		Profile         string   `json:"profile"`
		IncludeGlobs    []string `json:"includeGlobs"`
		ExcludeGlobs    []string `json:"excludeGlobs"`
		SecretScan      bool     `json:"secretScan"`
		SecretStrategy  string   `json:"secretStrategy"`
		TokenModel      string   `json:"tokenModel"`
		MaxBinarySizeMB int      `json:"maxBinarySizeMB"`
		TTLHours        int      `json:"ttlHours"`
		IdempotencyKey  string   `json:"idempotencyKey"`
	}{
		ExportID:        exp.ID,
		Owner:           req.Owner,
		Repo:            req.Repo,
		Ref:             req.Ref,
		Format:          req.Format,
		Profile:         req.Profile,
		IncludeGlobs:    req.IncludeGlobs,
		ExcludeGlobs:    req.ExcludeGlobs,
		SecretScan:      req.SecretScan,
		SecretStrategy:  req.SecretStrategy,
		TokenModel:      req.TokenModel,
		MaxBinarySizeMB: req.MaxBinarySizeMB,
		TTLHours:        req.TTLHours,
		IdempotencyKey:  req.IdempotencyKey,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		h.logger().Error("marshal export payload failed",
			slog.String("export_id", exp.ID),
			slog.Any("error", err),
		)
		httputil.WriteJSON(w, http.StatusInternalServerError, map[string]any{
			"code":    "payload_encode_failed",
			"message": "failed to prepare export payload",
		})
		return
	}

	if h.Queue == nil {
		h.logger().Error("enqueue export failed",
			slog.String("export_id", exp.ID),
			slog.String("queue", queueName),
			slog.String("reason", "queue_not_configured"),
		)
		httputil.WriteJSON(w, http.StatusInternalServerError, map[string]any{
			"code":    "enqueue_failed",
			"message": "failed to enqueue task",
		})
		return
	}

	task := asynq.NewTask(jobs.TaskTypeExport, payloadBytes, asynq.Queue(queueName))
	info, err := h.Queue.Enqueue(task)
	if err != nil {
		h.logger().Error("enqueue export failed",
			slog.String("export_id", exp.ID),
			slog.String("queue", queueName),
			slog.Int("payload_size", len(payloadBytes)),
			slog.Any("error", err),
		)
		httputil.WriteJSON(w, http.StatusInternalServerError, map[string]any{
			"code":    "enqueue_failed",
			"message": "failed to enqueue task",
		})
		return
	}

	h.logger().Info("export enqueued",
		slog.String("export_id", exp.ID),
		slog.String("queue", info.Queue),
		slog.String("task_id", info.ID),
		slog.Int("payload_size", len(payloadBytes)),
	)

	httputil.WriteJSON(w, http.StatusOK, map[string]any{
		"jobId":    exp.ID,
		"exportId": exp.ID,
		"status":   exp.Status,
	})
}
