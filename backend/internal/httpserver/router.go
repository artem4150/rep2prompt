package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/handlers"
	"github.com/yourname/cleanhttp/internal/httputil"
	"github.com/yourname/cleanhttp/internal/jobs/asynqqueue"
	"github.com/yourname/cleanhttp/internal/store"
	"github.com/yourname/cleanhttp/internal/storepg"
)

func New(cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{AddSource: true}))
	slog.SetDefault(logger)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong\n"))
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"ok": true,
			"ts": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// deps
	gh := githubclient.New(cfg)

	fsStore := artifacts.NewFSStore("./data/artifacts", 72)
	fsStore.StartGC(nil, 5*time.Minute)
	var artifactsStore artifacts.ArtifactsStore = fsStore

	var repo store.ExportsRepo
	if cfg.DatabaseURL != "" {
		pg, err := storepg.New(context.Background(), cfg.DatabaseURL)
		if err != nil {
			slog.Error("postgres connect failed", slog.String("error", err.Error()))
		} else {
			repo = pg
			slog.Info("postgres connected")
		}
	}
	exportsMem := store.NewExportsMemWithRepo("exp", repo)
	if repo != nil {
		exportsMem.StartSync(context.Background(), 2*time.Second)
	}
	var exportsStore store.ExportsStore = exportsMem

	// Asynq producer
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	asq, err := asynqqueue.New(asynqqueue.Opts{
		RedisAddr: addr,
		Password:  os.Getenv("REDIS_PASSWORD"),
		QueueHigh: "high",
		QueueDef:  "default",
		QueueLow:  "low",
		Timeout:   30 * time.Minute,
	})
	if err != nil {
		slog.Error("asynq init failed", slog.String("error", err.Error()))
	}

	api := http.NewServeMux()

	api.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * cfg.RequestTimeout)
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	api.Handle("/repo/resolve", handlers.NewResolveHandler(gh))
	api.Handle("/repo/tree", handlers.NewTreeHandler(gh, 3*time.Minute))
	api.Handle("/preview", handlers.NewPreviewHandler(gh))

	api.Handle("/export", &handlers.ExportAsyncHandler{
		Queue:   asq,          // теперь сигнатура совпадает с jobs.JobsQueue
		Exports: exportsStore, // ExportsMem (+ write-through в PG)
		GH:      gh,
	})

	api.Handle("/artifacts/", http.StripPrefix("/artifacts", &handlers.ArtifactsListHandler{Store: artifactsStore}))
	api.Handle("/download/", http.StripPrefix("/download", handlers.NewDownloadHandler(artifactsStore)))

	api.Handle("/jobs/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/cancel") && r.Method == http.MethodPost:
			(&handlers.JobCancelHandler{Exports: exportsStore}).ServeHTTP(w, r)
		case strings.HasSuffix(r.URL.Path, "/events"):
			(&handlers.JobEventsHandler{Exports: exportsStore, Logger: logger.With(slog.String("component", "jobs_sse"))}).ServeHTTP(w, r)
		default:
			(&handlers.JobStatusHandler{Exports: exportsStore}).ServeHTTP(w, r)
		}
	}))

	mux.Handle("/api/", http.StripPrefix("/api", api))

	h := http.Handler(mux)
	h = RequestID()(h)
	h = Recoverer()(h)
	h = Timeout(cfg.RequestTimeout)(h)
	h = Logger()(h)
	h = CORS(cfg.Env != config.EnvProd)(h)

	return h
}
