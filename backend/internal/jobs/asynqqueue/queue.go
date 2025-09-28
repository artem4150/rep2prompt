package asynqqueue

import (
	"encoding/json"
	"time"

	"github.com/hibiken/asynq"
	"github.com/yourname/cleanhttp/internal/jobs"
)

const taskTypeExport = "export:run"

type Queue struct {
	client *asynq.Client
	qHigh  string
	qDef   string
	qLow   string
	tmo    time.Duration
}

type Opts struct {
	RedisAddr string
	Password  string

	QueueHigh string
	QueueDef  string
	QueueLow  string

	Timeout time.Duration
}

func New(o Opts) (*Queue, error) {
	if o.QueueHigh == "" {
		o.QueueHigh = "high"
	}
	if o.QueueDef == "" {
		o.QueueDef = "default"
	}
	if o.QueueLow == "" {
		o.QueueLow = "low"
	}
	if o.Timeout <= 0 {
		o.Timeout = 30 * time.Minute
	}
	c := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     o.RedisAddr,
		Password: o.Password,
	})
	return &Queue{
		client: c,
		qHigh:  o.QueueHigh,
		qDef:   o.QueueDef,
		qLow:   o.QueueLow,
		tmo:    o.Timeout,
	}, nil
}

// Совпадает с твоим интерфейсом: без возвращаемых значений.
func (q *Queue) Enqueue(p jobs.Priority, t jobs.Task) {
	q.enqueueInternal(p, t, 0)
}

// EnqueueAfter — отложенная постановка (добавил под интерфейс).
// Также без возвращаемых значений.
func (q *Queue) EnqueueAfter(p jobs.Priority, t jobs.Task, delay time.Duration) {
	if delay < 0 {
		delay = 0
	}
	q.enqueueInternal(p, t, delay)
}

// ---- внутренняя реализация ----

func (q *Queue) enqueueInternal(p jobs.Priority, t jobs.Task, delay time.Duration) {
	payload, err := json.Marshal(t)
	if err != nil {
		return
	}
	task := asynq.NewTask(taskTypeExport, payload)

	dest := q.qDef
	switch p {
	case jobs.High:
		dest = q.qHigh
	case jobs.Low:
		dest = q.qLow
	}

	opts := []asynq.Option{
		asynq.Queue(dest),
		asynq.MaxRetry(12),
		asynq.Timeout(q.tmo),
		asynq.Retention(24 * time.Hour),
	}
	if delay > 0 {
		opts = append(opts, asynq.ProcessIn(delay))
	}

	_, _ = q.client.Enqueue(task, opts...)
}
