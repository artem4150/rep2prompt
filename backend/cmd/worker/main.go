// backend/cmd/worker/main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/hibiken/asynq"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/exporter"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/secrets"
	"github.com/yourname/cleanhttp/internal/store"
	"github.com/yourname/cleanhttp/internal/storepg"
)

const taskTypeExport = "export:run"

func env(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

type exportPayload struct {
	ExportID        string   `json:"exportId"`
	Owner           string   `json:"owner"`
	Repo            string   `json:"repo"`
	Ref             string   `json:"ref"`
	Format          string   `json:"format"`  // zip | txt | promptpack
	Profile         string   `json:"profile"` // для promptpack
	IncludeGlobs    []string `json:"includeGlobs"`
	ExcludeGlobs    []string `json:"excludeGlobs"`
	SecretScan      bool     `json:"secretScan"`
	SecretStrategy  string   `json:"secretStrategy"` // redacted|strip|mark
	TokenModel      string   `json:"tokenModel"`
	MaxBinarySizeMB int      `json:"maxBinarySizeMB"`
	TTLHours        int      `json:"ttlHours"`
	IdempotencyKey  string   `json:"idempotencyKey"`
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// --- deps: Postgres (exports), GitHub, Artifacts store (S3/FS) ---

	pg, err := storepg.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pg.Close()

	expStore := store.NewExportsMemWithRepo("exp", pg)

	gh := githubclient.New(cfg)

	var artStore artifacts.ArtifactsStore
	switch strings.ToLower(cfg.ArtifactsBackend) {
	case "s3":
		s3, err := artifacts.NewS3Store(artifacts.S3Config{
			Endpoint:  cfg.S3Endpoint, // ВАЖНО: для minio — "minio:9000", без http://
			Region:    cfg.S3Region,
			Bucket:    cfg.S3Bucket,
			AccessKey: cfg.S3AccessKey,
			SecretKey: cfg.S3SecretKey,
			UseSSL:    cfg.S3UseSSL,
			Prefix:    cfg.S3Prefix,
			TTLHours:  cfg.ArtifactsTTLHours,
		})
		if err != nil {
			logger.Error("s3 artifacts store init failed", slog.String("error", err.Error()))
		} else {
			artStore = s3
			logger.Info("artifacts store", slog.String("backend", "s3"))
		}
	}
	if artStore == nil {
		fs := artifacts.NewFSStore(cfg.ArtifactsDir, cfg.ArtifactsTTLHours)
		artStore = fs
		logger.Info("artifacts store", slog.String("backend", "fs"))
	}

	// --- Asynq server ---

	redisAddr := env("REDIS_ADDR", "localhost:6379")
	redisPass := os.Getenv("REDIS_PASSWORD")

	concurrency, _ := strconv.Atoi(env("WORKER_CONCURRENCY", "4"))
	queuesSpec := env("WORKER_QUEUES", "high=6,default=3,low=1")
	qcfg := map[string]int{}
	for _, part := range strings.Split(queuesSpec, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			w, _ := strconv.Atoi(kv[1])
			qcfg[kv[0]] = w
		}
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr, Password: redisPass},
		asynq.Config{Concurrency: concurrency, Queues: qcfg},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc(taskTypeExport, func(ctx context.Context, t *asynq.Task) error {
		var envelope struct {
			ExportID string          `json:"ExportID"`
			Payload  json.RawMessage `json:"Payload"`
		}
		if err := json.Unmarshal(t.Payload(), &envelope); err != nil {
			return err
		}
		if len(envelope.Payload) == 0 {
			return fmt.Errorf("empty payload")
		}

		var p exportPayload
		if err := json.Unmarshal(envelope.Payload, &p); err != nil {
			return err
		}
		if p.ExportID == "" {
			p.ExportID = envelope.ExportID
		}
		if p.ExportID == "" {
			return fmt.Errorf("empty exportId in payload")
		}
		format := strings.ToLower(strings.TrimSpace(p.Format))
		if format == "" {
			format = "zip"
		}

		// mark running
		expStore.UpdateStatus(p.ExportID, jobs.StatusRunning, 1, nil)

		owner := strings.TrimSpace(p.Owner)
		repo := strings.TrimSpace(p.Repo)
		ref := normalizeRef(p.Ref)

		// 1) скачать tarball из GitHub
		dctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
		rc, err := gh.GetTarball(dctx, owner, repo, ref)
		cancel()
		if err != nil {
			// Разрулим типичные кейсы: 404/401 → «ресурс не найден / нет доступа»
			msg := friendlyGhError(err, owner, repo, ref)
			expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)

			// 429/апстрим — возвращаем ошибку, чтобы asynq ретраил
			if _, ok := err.(*githubclient.RateLimitedError); ok || err == githubclient.ErrUpstream {
				return err
			}
			// остальные ошибки без ретраев
			return nil
		}
		defer rc.Close()

		// 2) собрать артефакт
		var (
			aw      *artifacts.ArtifactWriter
			meta    artifacts.ArtifactMeta
			outName string
		)

		switch format {
		case "zip":
			outName = "bundle.zip"
			aw, meta, err = artStore.CreateArtifact(p.ExportID, "zip", outName)
			if err != nil {
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}
			opts := exporter.Options{
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				MaxBinarySizeMB: p.MaxBinarySizeMB,
				MaxExportMB:     200,
				MaxFilenameLen:  255,
				StripFirstDir:   true,
			}
			if err := exporter.BuildZipFromTarGz(rc, aw, opts); err != nil {
				_ = aw.Close()
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}

		case "txt":
			outName = "concat.txt"
			aw, meta, err = artStore.CreateArtifact(p.ExportID, "txt", outName)
			if err != nil {
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}
			strat := secrets.StrategyRedacted
			switch strings.ToLower(p.SecretStrategy) {
			case "strip":
				strat = secrets.StrategyStrip
			case "mark":
				strat = secrets.StrategyMark
			}
			topts := exporter.TxtOptions{
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				StripFirstDir:   true,
				LineNumbers:     true,
				HeaderTemplate:  "=== FILE: {path} (first {n} lines) ===",
				MaxLinesPerFile: 10000,
				MaxExportMB:     200,
				SkipBinaries:    true,
				SecretScan:      p.SecretScan,
				SecretStrategy:  strat,
			}
			if err := exporter.BuildTxtFromTarGz(rc, aw, topts); err != nil {
				_ = aw.Close()
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}

		case "promptpack":
			outName = "promptpack.zip"
			aw, meta, err = artStore.CreateArtifact(p.ExportID, "zip", outName)
			if err != nil {
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}
			pp := exporter.PromptPackOptions{
				Owner:           owner,
				Repo:            repo,
				Ref:             ref,
				Profile:         exporter.Profile(strings.Title(strings.ToLower(p.Profile))),
				ModelID:         p.TokenModel,
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				MaxLinesPerFile: 0,
				MaskSecrets:     p.SecretScan,
				StripFirstDir:   true,
			}
			if err := exporter.BuildPromptPackFromTarGz(rc, aw, pp); err != nil {
				_ = aw.Close()
				msg := err.Error()
				expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
				return nil
			}

		default:
			msg := "unknown format: " + format
			expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
			return nil
		}

		// 3) Заливка в хранилище (закрытие writer)
		if err := aw.Close(); err != nil {
			msg := err.Error()
			expStore.UpdateStatus(p.ExportID, jobs.StatusError, 0, &msg)
			return nil
		}

		// 4) Сохраняем метаданные артефакта (для API-редиректа)
		s3key := path.Join("exports", p.ExportID, outName) // exports/<exportId>/<file>
		art := store.ArtifactMeta{
			Name:        outName,
			Path:        s3key,
			ContentType: contentTypeFor(format),
			Size:        meta.Size,
			ID:          meta.ID,
			Kind:        meta.Kind,
		}
		expStore.AddArtifact(p.ExportID, art)

		// 5) Готово
		expStore.SetProgress(p.ExportID, 100)
		expStore.UpdateStatus(p.ExportID, jobs.StatusDone, 100, nil)

		slog.Info("export finished",
			slog.String("export_id", p.ExportID),
			slog.String("owner", owner),
			slog.String("repo", repo),
			slog.String("ref", ref),
			slog.String("format", format),
			slog.String("key", s3key),
		)
		return nil
	})

	logger.Info("asynq worker started",
		slog.String("addr", redisAddr),
		slog.Int("concurrency", concurrency),
		slog.Any("queues", qcfg),
	)

	if err := srv.Run(mux); err != nil {
		log.Fatal(err)
	}
}

func contentTypeFor(format string) string {
	switch strings.ToLower(format) {
	case "txt":
		return "text/plain; charset=utf-8"
	case "promptpack", "zip":
		return "application/zip"
	default:
		return "application/octet-stream"
	}
}

// normalizeRef: "refs/heads/main" → "main", пусто → "HEAD"
func normalizeRef(ref string) string {
	r := strings.TrimSpace(ref)
	if r == "" || strings.EqualFold(r, "default") || strings.EqualFold(r, "latest") {
		return "HEAD"
	}
	r = strings.TrimPrefix(r, "refs/heads/")
	r = strings.TrimPrefix(r, "heads/")
	return r
}

// Преобразуем ошибки GitHub в дружелюбные сообщения на RU
func friendlyGhError(err error, owner, repo, ref string) string {
	// если в твоём githubclient есть типы ошибок — используй их.
	// Здесь просто текстом:
	e := strings.ToLower(err.Error())
	switch {
	case strings.Contains(e, "404"), strings.Contains(e, "not found"):
		return fmt.Sprintf("Ресурс не найден: %s/%s@%s", owner, repo, ref)
	case strings.Contains(e, "401"), strings.Contains(e, "unauthorized"), strings.Contains(e, "requires authentication"):
		return "Нет доступа к репозиторию (нужен GitHub token)"
	default:
		return "Ошибка GitHub: " + err.Error()
	}
}
