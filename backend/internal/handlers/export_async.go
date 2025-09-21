package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/httputil"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
	"github.com/yourname/cleanhttp/internal/worker"
)

// Версия экспортера — участвует в idempotency key.
const exporterVersion = "v0.10.0"

// ExportAsyncHandler — POST /api/export → ставит задачу в очередь и возвращает jobId.
type ExportAsyncHandler struct {
	Queue   *jobs.Queue
	Exports *store.ExportsMem
	GH      *githubclient.Client
}

// !!! ВАЖНО: имя структуры запросa уникальное для пакета handlers,
// чтобы не конфликтовать с export.go (sync).
type exportAsyncReq struct {
	Owner           string   `json:"owner"`
	Repo            string   `json:"repo"`
	Ref             string   `json:"ref"`
	Format          string   `json:"format"` // zip|txt|md
	Profile         string   `json:"profile"`
	IncludeGlobs    []string `json:"includeGlobs"`
	ExcludeGlobs    []string `json:"excludeGlobs"`
	SecretScan      bool     `json:"secretScan"`
	SecretStrategy  string   `json:"secretStrategy"`
	TokenModel      string   `json:"tokenModel"`
	MaxBinarySizeMB int      `json:"maxBinarySizeMB"`
	TTLHours        int      `json:"ttlHours"`
}

type exportRes struct {
	JobID string `json:"jobId"`
}

func (h *ExportAsyncHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST", nil)
		return
	}
	var in exportAsyncReq
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid JSON", map[string]any{"error": err.Error()})
		return
	}
	if in.Owner == "" || in.Repo == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "owner and repo are required", nil)
		return
	}
	if in.Ref == "" {
		in.Ref = "main"
	}
	if in.Format == "" {
		in.Format = "zip"
	}
	if in.TokenModel == "" {
		in.TokenModel = "openai:gpt-4o"
	}
	if in.TTLHours <= 0 {
		in.TTLHours = 72
	}

	// idem-key
	idem := worker.CalcIdemKey(
		in.Owner, in.Repo, in.Ref,
		strings.ToLower(in.Format),
		strings.ToLower(in.Profile),
		in.IncludeGlobs, in.ExcludeGlobs,
		in.SecretScan, strings.ToUpper(in.SecretStrategy),
		in.TokenModel, exporterVersion,
	)

	exp, reused := h.Exports.CreateOrReuse(in.Owner, in.Repo, in.Ref, store.ExportOptions{
		IncludeGlobs:    in.IncludeGlobs,
		ExcludeGlobs:    in.ExcludeGlobs,
		SecretScan:      in.SecretScan,
		SecretStrategy:  in.SecretStrategy,
		TokenModel:      in.TokenModel,
		TTLHours:        in.TTLHours,
		MaxBinarySizeMB: in.MaxBinarySizeMB,
		Profile:         strings.ToLower(in.Profile),
		Format:          strings.ToLower(in.Format),
		IdempotencyKey:  idem,
	})

	// если уже стоит/бежит — просто вернём существующий jobId
	if reused && (exp.Status == jobs.StatusQueued || exp.Status == jobs.StatusRunning) {
		httputil.WriteJSON(w, http.StatusOK, exportRes{JobID: exp.ID})
		return
	}

	// Ставим новую задачу.
	p := worker.ExportPayload{
		ExportID:        exp.ID,
		Owner:           in.Owner,
		Repo:            in.Repo,
		Ref:             in.Ref,
		Format:          strings.ToLower(in.Format),
		Profile:         strings.ToLower(in.Profile),
		IncludeGlobs:    in.IncludeGlobs,
		ExcludeGlobs:    in.ExcludeGlobs,
		SecretScan:      in.SecretScan,
		SecretStrategy:  in.SecretStrategy,
		TokenModel:      in.TokenModel,
		MaxBinarySizeMB: in.MaxBinarySizeMB,
		TTLHours:        in.TTLHours,
		IdempotencyKey:  idem,
	}
	task := jobs.Task{ExportID: exp.ID, Attempt: 0, Payload: p}
	priority := jobs.Default
	if p.Format == "txt" || p.Format == "md" { // лёгкие — в high
		priority = jobs.High
	}
	h.Queue.Enqueue(priority, task)

	httputil.WriteJSON(w, http.StatusOK, exportRes{JobID: exp.ID})
}
