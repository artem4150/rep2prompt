package handlers // пакет хендлеров

import (
	"context" // локальный таймаут на внешний вызов
	"fmt"     // соберём ключ кэша
	"net/http"
	"sync"    // синхронизация доступа к кэшу
	"time"

	"github.com/yourname/cleanhttp/internal/githubclient" // наш GitHub-клиент
	"github.com/yourname/cleanhttp/internal/httputil"     // унифицированные JSON-ответы
)

// TreeHandler — хендлер с зависимостями: GitHub-клиент и кэш.
type TreeHandler struct {
	GH    *githubclient.Client // внешний API-клиент
	cache *treeCache           // простой in-memory кэш
}

// NewTreeHandler — конструктор. ttl задаёт срок жизни записи.
func NewTreeHandler(gh *githubclient.Client, ttl time.Duration) *TreeHandler {
	return &TreeHandler{
		GH:    gh,
		cache: newTreeCache(ttl),
	}
}

// ServeHTTP — реализация GET /api/repo/tree?owner=..&repo=..&ref=..
// Если ref не указан, по умолчанию используем "main".
func (h *TreeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Разрешаем только GET
	if r.Method != http.MethodGet {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET is allowed", nil)
		return
	}

	// Читаем query-параметры
	q := r.URL.Query()              // получаем map[string][]string
	owner := q.Get("owner")         // первый owner из строки запроса
	repo := q.Get("repo")           // первый repo
	ref := q.Get("ref")             // ветка/тег/коммит
	if ref == "" { ref = "main" }   // наш контракт: дефолт — "main"

	// Валидация
	if owner == "" || repo == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "owner and repo are required", nil)
		return
	}

	// Ключ кэша вида: tree:owner/repo@ref
	key := fmt.Sprintf("tree:%s/%s@%s", owner, repo, ref)

	// 1) Попробуем отдать из кэша
	if items, ok := h.cache.Get(key); ok {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}

	// 2) Иначе идём к GitHub с отдельным таймаутом на вызов
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	items, err := h.GH.GetTree(ctx, owner, repo, ref)
	if err != nil {
		// Развилка по типам/кодам ошибок — такие же правила, как в resolve
		if rl, ok := err.(*githubclient.RateLimitedError); ok {
			httputil.WriteError(w, http.StatusTooManyRequests, "rate_limited", "GitHub API rate limited", map[string]any{"reset": rl.Reset})
			return
		}
		if err == githubclient.ErrNotFound {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "repository or ref not found", nil)
			return
		}
		if err == githubclient.ErrUpstream {
			httputil.WriteError(w, http.StatusBadGateway, "upstream_error", "GitHub upstream error", nil)
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "internal error", map[string]any{"error": err.Error()})
		return
	}

	// 3) Сохраним в кэш и вернём клиенту
	h.cache.Set(key, items)
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ===== Простейший in-memory кэш с TTL =====

type treeCache struct {
	mu   sync.RWMutex                              // защищает map от гонок
	ttl  time.Duration                             // срок жизни записи
	data map[string]struct{ until time.Time; v []githubclient.TreeItem } // значение + срок годности
}

func newTreeCache(ttl time.Duration) *treeCache {
	return &treeCache{
		ttl:  ttl,
		data: make(map[string]struct{ until time.Time; v []githubclient.TreeItem }),
	}
}

func (c *treeCache) Get(key string) ([]githubclient.TreeItem, bool) {
	c.mu.RLock()
	entry, ok := c.data[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	// Проверяем срок годности
	if time.Now().After(entry.until) {
		// Протухло — удалим и скажем «нет»
		c.mu.Lock()
		delete(c.data, key)
		c.mu.Unlock()
		return nil, false
	}
	// Возвращаем копию среза (чтобы вызывающий не мог испортить наш кэш)
	out := make([]githubclient.TreeItem, len(entry.v))
	copy(out, entry.v)
	return out, true
}

func (c *treeCache) Set(key string, v []githubclient.TreeItem) {
	c.mu.Lock()
	defer c.mu.Unlock()
	// Кладём копию среза в кэш, выставляем TTL
	cp := make([]githubclient.TreeItem, len(v))
	copy(cp, v)
	c.data[key] = struct {
		until time.Time
		v     []githubclient.TreeItem
	}{
		until: time.Now().Add(c.ttl),
		v:     cp,
	}
}
