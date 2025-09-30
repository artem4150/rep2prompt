package httpserver

import (
	"context"
	"log/slog"
	"net/http"
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

	var artifactsStore artifacts.ArtifactsStore
	switch strings.ToLower(cfg.ArtifactsBackend) {
	case "s3":
		s3Store, err := artifacts.NewS3Store(artifacts.S3Config{
			Endpoint:  cfg.S3Endpoint,
			Region:    cfg.S3Region,
			Bucket:    cfg.S3Bucket,
			AccessKey: cfg.S3AccessKey,
			SecretKey: cfg.S3SecretKey,
			UseSSL:    cfg.S3UseSSL,
			Prefix:    cfg.S3Prefix,
			TTLHours:  cfg.ArtifactsTTLHours,
		})
		if err != nil {
			slog.Error("s3 artifacts store init failed", slog.String("error", err.Error()))
		} else {
			artifactsStore = s3Store
			slog.Info("artifacts store", slog.String("backend", "s3"))
		}
	}
	if artifactsStore == nil {
		fsStore := artifacts.NewFSStore(cfg.ArtifactsDir, cfg.ArtifactsTTLHours)
		fsStore.StartGC(nil, 5*time.Minute)
		artifactsStore = fsStore
		slog.Info("artifacts store", slog.String("backend", "fs"))
	}

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
	asqClient := asynqqueue.NewClient()

	api := http.NewServeMux()

	api.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * cfg.RequestTimeout)
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	api.Handle("/repo/resolve", handlers.NewResolveHandler(gh))
	api.Handle("/repo/tree", handlers.NewTreeHandler(gh, 3*time.Minute))
	api.Handle("/preview", handlers.NewPreviewHandler(gh))

	api.Handle("/export", &handlers.ExportAsyncHandler{
		Queue:   asqClient,
		Exports: exportsStore,
		GH:      gh,
		Logger:  logger.With(slog.String("component", "api_export")),
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
