package httpserver

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourname/cleanhttp/internal/httputil"
)

type ctxKey string

const ctxKeyRequestID ctxKey = "req_id"

func RequestID() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := uuid.NewString()
			w.Header().Set("X-Request-ID", reqID)
			ctx := context.WithValue(r.Context(), ctxKeyRequestID, reqID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Recoverer() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					slog.Default().Error("panic recovered",
						slog.Any("panic", rec),
						slog.String("requestId", ReqIDFromContext(r.Context())),
					)
					httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func Timeout(d time.Duration) func(http.Handler) http.Handler {
	// Если таймаут 0 или меньше — просто возвращаем next без обёртки.
	if d <= 0 {
		return func(next http.Handler) http.Handler { return next }
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Для SSE-потоков (Accept: text/event-stream) не оборачиваем writer буфером,
			// чтобы не ломать стриминг и не требовать Flush() от буфера.
			if strings.Contains(r.Header.Get("Accept"), "text/event-stream") || strings.HasSuffix(r.URL.Path, "/events") {
				next.ServeHTTP(w, r)
				return
			}

			// Создаём новый контекст с дедлайном.
			ctx, cancel := context.WithTimeout(r.Context(), d)
			defer cancel()

			// Буферизованный ResponseWriter: перехватывает заголовки/статус/тело.
			brw := newBufferRW(w)

			done := make(chan struct{})
			go func() {
				// Запускаем хендлер "в фоне", но с нашим контекстом с таймаутом.
				next.ServeHTTP(brw, r.WithContext(ctx))
				close(done)
			}()

			select {
			case <-done:
				// Хендлер успел — "проливаем" из буфера в реальный writer.
				brw.flush()
			case <-ctx.Done():
				// Время вышло — логируем и отвечаем клиенту 504 (Gateway Timeout).
				slog.Default().Warn("request timeout",
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
					slog.String("requestId", ReqIDFromContext(r.Context())),
					slog.Duration("timeout", d),
				)
				httputil.WriteError(w, http.StatusGatewayTimeout, "timeout", "request timed out", nil)
			}
		})
	}
}

type bufferRW struct {
	w      http.ResponseWriter // реальный writer клиента
	hdr    http.Header         // наши заголовки (отдельно от w.Header())
	buf    bytes.Buffer        // тело ответа
	status int                 // статус, по умолчанию 200
}

func newBufferRW(w http.ResponseWriter) *bufferRW {
	return &bufferRW{
		w:      w,
		hdr:    make(http.Header),
		status: http.StatusOK,
	}
}

// Header возвращает "наши" заголовки (не напрямую заголовки клиента).
func (b *bufferRW) Header() http.Header { return b.hdr }

// WriteHeader — просто запоминаем код статуса, но не шлём его клиенту прямо сейчас.
func (b *bufferRW) WriteHeader(code int) { b.status = code }

// Write — складываем тело в буфер (пока не flush).
func (b *bufferRW) Write(p []byte) (int, error) { return b.buf.Write(p) }

// flush — "проливает" то, что накопили, в реальный ResponseWriter клиента.
func (b *bufferRW) flush() {
	// Переносим заголовки в настоящий writer.
	for k, vv := range b.hdr {
		for _, v := range vv {
			b.w.Header().Add(k, v)
		}
	}
	// Если контент-тайп не задан — поставим простой текст по умолчанию,
	// чтобы клиенты корректно поняли кодировку.
	if b.w.Header().Get("Content-Type") == "" {
		b.w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	}
	// Пишем статус и тело.
	b.w.WriteHeader(b.status)
	_, _ = b.w.Write(b.buf.Bytes())
}

// ========================= Logger =========================
//
// Простой access-лог: метод, путь, статус, длительность, размер ответа, request id.

type statusRecorder struct {
	http.ResponseWriter
	status int // последний записанный статус
	bytes  int // объём тела ответа в байтах
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

func (sr *statusRecorder) Write(p []byte) (int, error) {
	n, err := sr.ResponseWriter.Write(p)
	sr.bytes += n
	return n, err
}

// Flush проксирует Flush() базового writer'а, если он поддерживает http.Flusher.
// Это позволяет не ломать SSE-эндпоинты, которым нужен Flush для отправки событий.
func (sr *statusRecorder) Flush() {
	if flusher, ok := sr.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func Logger() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			start := time.Now()
			next.ServeHTTP(rec, r)
			dur := time.Since(start)
			slog.Default().Info("request completed",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", rec.status),
				slog.Duration("duration", dur),
				slog.Int("bytes", rec.bytes),
				slog.String("requestId", ReqIDFromContext(r.Context())),
			)
		})
	}
}

// ========================= CORS =========================
//
// CORS — отвечает на preflight-запросы (OPTIONS) и проставляет заголовки.
// allowAll=true (для dev/test) — ставим Access-Control-Allow-Origin: *
// allowAll=false (prod) — "отражаем" Origin (простой и безопасный вариант без списка).
func CORS(allowAll bool) func(http.Handler) http.Handler {
	// Ограничиваем доступные методы и заголовки — минимально необходимое.
	allowedMethods := "GET,POST,OPTIONS"
	allowedHeaders := "Content-Type,Authorization"

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowAll {
				// Dev/Test: максимально просто.
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" {
				// Prod: отражаем конкретный Origin, а не "*".
				// Также добавляем Vary, чтобы прокси/кэши понимали, что ответ зависит от Origin.
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Add("Vary", "Origin")
			}

			w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
			w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)

			// Preflight-запросы должны отвечаться быстро без тела.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent) // 204 No Content
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func ReqIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyRequestID).(string); ok {
		return v
	}
	return ""
}
