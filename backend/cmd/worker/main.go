package main

import (
	"context"
	"encoding/json"
	"log"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/jobs"
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
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// PG
	repo, err := storepg.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer repo.Close()

	// GH (пока не используем в заглушке)
	_ = githubclient.New(cfg)

	// FS (пока не используем в заглушке)
	_ = artifacts.NewFSStore("./data/artifacts", 72)

	// ExportsMem с write-through в PG
	expStore := store.NewExportsMemWithRepo("exp", repo)

	// Redis/Asynq
	redisAddr := env("REDIS_ADDR", "localhost:6379")
	redisPass := os.Getenv("REDIS_PASSWORD")
	concurrency, _ := strconv.Atoi(env("WORKER_CONCURRENCY", "4"))

	queuesSpec := env("WORKER_QUEUES", "high=6,default=3,low=1")
	qcfg := map[string]int{}
	for _, part := range strings.Split(queuesSpec, ",") {
		if part = strings.TrimSpace(part); part == "" {
			continue
		}
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		w, _ := strconv.Atoi(kv[1])
		qcfg[kv[0]] = w
	}

	srv := asynq.NewServer(asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: redisPass,
	}, asynq.Config{
		Concurrency: concurrency,
		Queues:      qcfg,
	})

	mux := asynq.NewServeMux()
	mux.HandleFunc(taskTypeExport, func(ctx context.Context, task *asynq.Task) error {
		// 1) распакуем payload (минимум exportId)
		var p exportPayload
		if err := json.Unmarshal(task.Payload(), &p); err != nil {
			return err
		}
		if p.ExportID == "" {
			// если в Task.ExportID был id, полезной нагрузки может не быть — подстрахуемся
			var t struct {
				ExportID string `json:"exportId"`
			}
			_ = json.Unmarshal(task.Payload(), &t)
			p.ExportID = t.ExportID
		}

		// 2) простая заглушка: running -> done (чтобы Asynq-поток работал)
		expStore.UpdateStatus(p.ExportID, jobs.StatusRunning, 10, nil)
		time.Sleep(500 * time.Millisecond) // имитация работы
		expStore.UpdateStatus(p.ExportID, jobs.StatusDone, 100, nil)
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
