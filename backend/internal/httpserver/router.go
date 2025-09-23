package httpserver

import (
	"context"
	"net/http"
	"strings"
	"time"
"log"
	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/handlers"
	"github.com/yourname/cleanhttp/internal/httputil"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
	"github.com/yourname/cleanhttp/internal/worker"
)

func New(cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	// простая главная
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong\n"))
	})

	// healthz
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"ok": true,
			"ts": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// ========= зависимости для API/воркеров =========
	gh := githubclient.New(cfg)

	// FS-хранилище артефактов + GC
	fsStore := artifacts.NewFSStore("./data/artifacts", 72) // TTL 72 часа
	fsStore.StartGC(nil, 5*time.Minute)                     // периодическая очистка по TTL

	exportsDB := store.NewExportsMem("exp")
	queue := jobs.NewQueue(128)
runner := worker.NewRunner(worker.Deps{
    GH:          gh,
    Store:       fsStore,
    Exports:     exportsDB,
    MaxAttempts: 3,
    Logger:      log.Default(), // <— добавили
})
	// стартуем воркеров (конкурентность/ретраи можно вынести в cfg/env)
	go queue.StartWorkers(context.Background(), 4, runner, 3)

	// ========= API =========
	api := http.NewServeMux()

	// тестовый медленный хендлер
	api.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * cfg.RequestTimeout)
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	// шаг 2–3
	api.Handle("/repo/resolve", handlers.NewResolveHandler(gh))
	api.Handle("/repo/tree", handlers.NewTreeHandler(gh, 3*time.Minute))
	api.Handle("/preview", handlers.NewPreviewHandler(gh))

	// шаг 10: асинхронная постановка экспорта
	api.Handle("/export", &handlers.ExportAsyncHandler{
		Queue: queue, Exports: exportsDB, GH: gh,
	})

	// список артефактов по exportId
	api.Handle("/artifacts/", http.StripPrefix("/artifacts", &handlers.ArtifactsListHandler{Store: fsStore}))

	// скачивание готового файла (по artifactId)
	api.Handle("/download/", http.StripPrefix("/download", handlers.NewDownloadHandler(fsStore)))

	// статус/отмена задач
	api.Handle("/jobs/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/cancel") && r.Method == http.MethodPost {
			(&handlers.JobCancelHandler{Exports: exportsDB}).ServeHTTP(w, r)
			return
		}
		(&handlers.JobStatusHandler{Exports: exportsDB}).ServeHTTP(w, r)
	}))

	// монтируем /api/*
	mux.Handle("/api/", http.StripPrefix("/api", api))

	// ========= middleware-цепочка =========
	h := http.Handler(mux)
	h = RequestID()(h)
	h = Recoverer()(h)
	h = Timeout(cfg.RequestTimeout)(h)
	h = Logger()(h)
	h = CORS(cfg.Env != config.EnvProd)(h) // CORS только вне prod

	return h
}
