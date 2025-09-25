package jobs

import (
	"context"
	"time"
)

// JobsQueue описывает очередь задач экспорта.
type JobsQueue interface {
	Enqueue(p Priority, t Task)
	EnqueueAfter(p Priority, t Task, d time.Duration)
	StartWorkers(ctx context.Context, n int, runner Runner, maxAttempts int)
}
