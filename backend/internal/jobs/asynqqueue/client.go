package asynqqueue

import (
	"os"
	"strings"

	"github.com/hibiken/asynq"
)

// NewClient creates an asynq client configured from environment variables.
// REDIS_ADDR defaults to "redis:6379" when not provided. REDIS_PASSWORD is optional.
func NewClient() *asynq.Client {
	addr := strings.TrimSpace(os.Getenv("REDIS_ADDR"))
	if addr == "" {
		addr = "redis:6379"
	}
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr:     addr,
		Password: os.Getenv("REDIS_PASSWORD"),
	})
}
