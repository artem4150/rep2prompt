package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// EnqueueOnly — локальный минимальный интерфейс для продюсера очереди.
// Нам не нужен StartWorkers: воркер запускается отдельным процессом.
type EnqueueOnly interface {
	Enqueue(p jobs.Priority, t jobs.Task)
	EnqueueAfter(p jobs.Priority, t jobs.Task, delay time.Duration)
}

type ExportAsyncHandler struct {
	Queue   EnqueueOnly          // ← было: jobs.JobsQueue
	Exports store.ExportsStore
	GH      *githubclient.Client
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Ref == "" {
		req.Ref = "main"
	}

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

	priority := jobs.Default
	switch req.Priority {
	case "high":
		priority = jobs.High
	case "low":
		priority = jobs.Low
	}

	// интерфейс без возвратов — просто ставим задачу
	h.Queue.Enqueue(priority, jobs.Task{
		ExportID: exp.ID,
		Attempt:  0,
		Payload: map[string]any{
			"exportId":        exp.ID,
			"owner":           req.Owner,
			"repo":            req.Repo,
			"ref":             req.Ref,
			"format":          req.Format,
			"profile":         req.Profile,
			"includeGlobs":    req.IncludeGlobs,
			"excludeGlobs":    req.ExcludeGlobs,
			"secretScan":      req.SecretScan,
			"secretStrategy":  req.SecretStrategy,
			"tokenModel":      req.TokenModel,
			"maxBinarySizeMB": req.MaxBinarySizeMB,
			"ttlHours":        req.TTLHours,
			"idempotencyKey":  req.IdempotencyKey,
		},
	})

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"exportId": exp.ID,
		"status":   exp.Status,
	})
}
