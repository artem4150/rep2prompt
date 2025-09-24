package jobs

import (
	"context"
	"errors"
	"time"
)

// Status — состояния задачи экспорта (из спецификации шага 10).
type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusDone      Status = "done"
	StatusError     Status = "error"
	StatusCancelled Status = "cancelled"
)

// RetryableError — сигнал воркеру, что ошибку можно/нужно ретраить.
type RetryableError struct {
	After  time.Duration // delay перед повтором
	Reason string        // человекочитаемая причина
}

func (e *RetryableError) Error() string { return "retryable: " + e.Reason }

// Runner — функция, которая реально выполняет задачу.
type Runner func(ctx context.Context, t Task) error

// Task — элемент очереди. Attempt увеличиваем при ретраях.
type Task struct {
	ExportID string
	Attempt  int
	Payload  any // JSON-пэйлоад; воркер знает его точный тип
}

// Priority — три очереди, как в ТЗ.
type Priority int

const (
	High Priority = iota
	Default
	Low
)

// Queue — простая in-memory очередь с тремя приоритами.
type Queue struct {
	chHigh    chan Task
	chDefault chan Task
	chLow     chan Task
}

func NewQueue(buf int) *Queue {
	return &Queue{
		chHigh:    make(chan Task, buf),
		chDefault: make(chan Task, buf),
		chLow:     make(chan Task, buf),
	}
}

func (q *Queue) Enqueue(p Priority, t Task) {
	switch p {
	case High:
		q.chHigh <- t
	case Low:
		q.chLow <- t
	default:
		q.chDefault <- t
	}
}

// EnqueueAfter — отложенная постановка (для backoff ретраев).
func (q *Queue) EnqueueAfter(p Priority, t Task, d time.Duration) {
	time.AfterFunc(d, func() { q.Enqueue(p, t) })
}

// StartWorkers — запускает N воркеров, которые «вынимают» задачи по приоритету.
func (q *Queue) StartWorkers(ctx context.Context, n int, runner Runner, maxAttempts int) {
	for i := 0; i < n; i++ {
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				default:
				}

				// «вейтер» по приоритетам: high → default → low
				var t Task
				var ok bool
				select {
				case t, ok = <-q.chHigh:
				default:
					select {
					case t, ok = <-q.chDefault:
					default:
						select {
						case t, ok = <-q.chLow:
						case <-time.After(50 * time.Millisecond):
							continue
						}
					}
				}
				if !ok {
					// канал закрыт — выходим
					return
				}

				// На задаче создаём таймаут джоба (жёсткий), см. шаг 10.7
				jobCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
				err := runner(jobCtx, t)
				cancel()

				var rerr *RetryableError
				switch {
				case errors.As(err, &rerr) && t.Attempt+1 < maxAttempts:
					// экспоненциальный backoff 1x/2x/4x + джиттер
					delay := rerr.After
					if delay <= 0 {
						delay = time.Second
					}
					delay = delay << t.Attempt
					jitter := time.Duration(int64(delay) / 5)
					if jitter > 0 {
						delay += time.Duration(time.Now().UnixNano() % int64(jitter)) // простой джиттер
					}
					t.Attempt++
					q.EnqueueAfter(Default, t, delay)
				default:
					// done/terminal — ничего не делаем; runner сам финализировал статус
				}
			}
		}()
	}
}
