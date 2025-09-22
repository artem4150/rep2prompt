package githubclient // тот же пакет, что и parse.go

import (
	"context"       // передача контекста (отмена, дедлайны) в HTTP-запросы
	"encoding/json" // декодирование JSON-ответов GitHub API
	"errors"        // константные/обёрточные ошибки
	"fmt"           // форматирование строк (Sprintf)
	"io"            // чтение тела ответа (io.ReadAll)
	"net/http"      // HTTP-клиент, запросы/ответы
	"strings"       // манипуляция строками (проверка/склейка путей)
	"time"          // таймауты, тип Duration

	"github.com/yourname/cleanhttp/internal/config" // импортируем Config из нашего проекта
)

// HTTPDoer — интерфейс "то, что умеет Do(*http.Request)".
// Мы выносим его отдельно, чтобы в тестах подменять реальный http.Client на мок.
type HTTPDoer interface {
	Do(*http.Request) (*http.Response, error) // сигнатура метода Do, как у http.Client
}

// Client — наш обёрточный GitHub API клиент.
type Client struct {
	BaseURL string        // базовый адрес API, по умолчанию "https://api.github.com"
	Token   string        // OAuth-токен (если есть), добавим заголовок Authorization: Bearer <token>
	Doer    HTTPDoer      // конкретная реализация Doer (обычно *http.Client, но можно мок)
	Timeout time.Duration // общий таймаут (настраиваем http.Client.Timeout)
}

// Константные ошибки для семантики наверх (хендлеру легче мапить коды)
var (
	ErrNotFound = errors.New("not_found")      // 404 от GitHub
	ErrUpstream = errors.New("upstream_error") // 5xx от GitHub
)

// RateLimitedError — специальная ошибка, когда мы уткнулись в лимиты GitHub.
// Поле Reset — epoch-время (секунды), когда лимит сбрасывается.
type RateLimitedError struct {
	Reset int64 // Unix seconds (из X-RateLimit-Reset)
}

// Error — реализация интерфейса error для нашего типа
func (e *RateLimitedError) Error() string {
	return fmt.Sprintf("rate_limited (reset=%d)", e.Reset) // человекочитаемая форма
}

// New создаёт клиент с дефолтным BaseURL и http.Client с таймаутом из cfg.
func New(cfg config.Config) *Client {
	// Используем http.Client без глобального Timeout.
	// Все ограничения по времени устанавливаются через context.WithTimeout
	// в вызывающем коде (например, для tarball скачивания мы даём до 2 минут).
	// Глобальный Timeout у http.Client прерывал длительные загрузки файлов и
	// приводил к ошибке "network error; retry later" при экспорте больших репо.
	httpClient := &http.Client{}
	return &Client{
		BaseURL: "https://api.github.com", // стандартный адрес GitHub REST API
		Token:   cfg.GitHubToken,          // берём токен из конфига (может быть пустым)
		Doer:    httpClient,               // по умолчанию используем http.Client как Doer
		Timeout: cfg.RequestTimeout,       // сохраняем для справки
	}
}

// ensureLeadingSlash — маленький helper: гарантирует, что path начинается с "/".
func ensureLeadingSlash(path string) string {
	if !strings.HasPrefix(path, "/") { // если нет ведущего слеша
		return "/" + path // добавляем
	}
	return path // уже есть — возвращаем как есть
}

// GetJSON выполняет GET-запрос к BaseURL+path и декодирует JSON-ответ в v.
// Возвращает HTTP-статус ответа и ошибку (в т.ч. осмысленные ошибки по rate-limit/404/5xx).
func (c *Client) GetJSON(ctx context.Context, path string, v any) (int, error) {
	fullURL := c.BaseURL + ensureLeadingSlash(path) // собираем полный URL запроса

	// Создаём новый запрос с контекстом — так мы сможем отменять его извне.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil) // метод GET, тела нет
	if err != nil {                                                           // ошибка формирования запроса (почти не бывает)
		return 0, err
	}

	// Минимально корректные заголовки для GitHub REST API
	req.Header.Set("Accept", "application/vnd.github+json") // рекомендуемый Accept
	// X-GitHub-Api-Version можно не ставить; при желании добавь фиксированную версию
	if c.Token != "" { // если у нас есть токен
		req.Header.Set("Authorization", "Bearer "+c.Token) // аутентификация через OAuth токен
	}

	// Выполняем запрос через абстракцию Doer — это позволит мокать в тестах.
	res, err := c.Doer.Do(req) // отправляем запрос
	if err != nil {            // сетевые ошибки / отмена контекста и т.д.
		return 0, err
	}
	defer res.Body.Close() // гарантируем закрытие тела ответа, чтобы не протекли ресурсы

	// Специальная обработка rate-limit: GitHub обычно шлёт 403 с X-RateLimit-Remaining: 0,
	// также может прилететь 429 (Too Many Requests).
	if res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusTooManyRequests {
		// Читаем заголовок X-RateLimit-Remaining — если "0", то это rate limit.
		if strings.TrimSpace(res.Header.Get("X-RateLimit-Remaining")) == "0" {
			// Извлекаем X-RateLimit-Reset — секунды UNIX, когда лимит сбросится.
			resetStr := res.Header.Get("X-RateLimit-Reset")
			var reset int64
			if resetStr != "" {
				// преобразуем строку в int64; если ошибка — оставим 0
				fmt.Sscanf(resetStr, "%d", &reset)
			}
			return res.StatusCode, &RateLimitedError{Reset: reset} // возвращаем осмысленную ошибку
		}
		// Если Remaining не 0 — отдаём как есть (может быть другой запрет)
	}

	// Для 2xx успешных ответов — декодируем JSON в v.
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		// Можно декодировать напрямую из res.Body в v:
		// return res.StatusCode, json.NewDecoder(res.Body).Decode(v)
		// Но иногда удобно прочитать полностью (для логов/отладки). Сделаем напрямую:
		return res.StatusCode, json.NewDecoder(res.Body).Decode(v)
	}

	// Для неуспехов (4xx/5xx) — прочитаем тело, чтобы не оставить сокет полузанятым.
	_, _ = io.ReadAll(res.Body) // игнорируем содержимое; главное — вычитать

	// Карта статусов → ошибок верхнего уровня
	if res.StatusCode == http.StatusNotFound { // 404
		return res.StatusCode, ErrNotFound
	}
	if res.StatusCode >= 500 { // любые 5xx
		return res.StatusCode, ErrUpstream
	}

	// Прочие коды — возвращаем "обычную" ошибку с кодом
	return res.StatusCode, fmt.Errorf("unexpected status: %d", res.StatusCode)
}

// GetDefaultBranch достаёт default_branch репозитория через /repos/{owner}/{repo}.
func (c *Client) GetDefaultBranch(ctx context.Context, owner, repo string) (string, error) {
	// Формируем путь запроса к GitHub API
	path := fmt.Sprintf("/repos/%s/%s", owner, repo) // подстановка owner и repo в путь

	// Определяем временную структуру только с тем полем, что нам нужно
	var out struct {
		DefaultBranch string `json:"default_branch"` // тэг json указывает имя поля в JSON
	}

	// Вызываем вспомогательный метод GetJSON (он уже обрабатывает лимиты/коды)
	status, err := c.GetJSON(ctx, path, &out) // передаём адрес out, чтобы заполнить его
	if err != nil {                           // если ошибка не пустая
		// Если это rate limit — пробрасываем как есть (хендлер сам решит код 429)
		if _, ok := err.(*RateLimitedError); ok { // проверка типа через type assertion
			return "", err
		}
		// Прочие ошибки — пробрасываем как есть; наверху замапим на нужный ответ
		return "", err
	}

	// Если кода ошибки нет, но статус не 2xx (маловероятно здесь), всё равно проверим
	if status == http.StatusNotFound { // 404
		return "", ErrNotFound
	}
	if status >= 500 { // 5xx
		return "", ErrUpstream
	}

	// Успех — возвращаем ветку
	return out.DefaultBranch, nil
}
