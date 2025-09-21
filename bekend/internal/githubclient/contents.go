package githubclient

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// ErrTooLarge — если Content-Length > лимита (мы отказываем заранее).
var ErrTooLarge = fmt.Errorf("too_large")

// GetRawFile скачивает файл из репозитория и возвращает первые maxBytes.
// • Если Content-Length известен и > maxBytes → ErrTooLarge;
// • Если длина неизвестна — читаем до maxBytes+1, чтобы понять truncated;
// • Возвращаем (data, truncated, err).
func (c *Client) GetRawFile(ctx context.Context, owner, repo, pth, ref string, maxBytes int64) ([]byte, bool, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/contents/%s?ref=%s",
		c.BaseURL, owner, repo, pth, ref)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, false, err
	}
	// Просим "сырой" контент, а не JSON-описание файла
	req.Header.Set("Accept", "application/vnd.github.raw")
	req.Header.Set("User-Agent", "cleanhttp/0.1") // GitHub любит явный UA
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	res, err := c.Doer.Do(req)
	if err != nil {
		return nil, false, err
	}
	defer res.Body.Close()

	// rate-limit: 403/429 + Remaining==0
	if res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusTooManyRequests {
		if strings.TrimSpace(res.Header.Get("X-RateLimit-Remaining")) == "0" {
			var reset int64
			if v := res.Header.Get("X-RateLimit-Reset"); v != "" {
				if n, _ := strconv.ParseInt(v, 10, 64); n > 0 {
					reset = n
				}
			}
			return nil, false, &RateLimitedError{Reset: reset}
		}
	}
	if res.StatusCode == http.StatusNotFound {
		return nil, false, ErrNotFound
	}
	if res.StatusCode >= 500 {
		_, _ = io.ReadAll(res.Body)
		return nil, false, ErrUpstream
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		_, _ = io.ReadAll(res.Body)
		return nil, false, fmt.Errorf("unexpected status: %d", res.StatusCode)
	}

	// Если сервер назвал размер — можем отказать сразу.
	if cl := res.Header.Get("Content-Length"); cl != "" && maxBytes > 0 {
		if n, err := strconv.ParseInt(cl, 10, 64); err == nil && n > maxBytes {
			return nil, false, ErrTooLarge
		}
	}

	// Читаем до maxBytes+1, чтобы понять, обрезалось ли.
	limit := maxBytes
	if limit <= 0 {
		limit = 2 * 1024 * 1024 // запасной лимит по умолчанию (2 MiB), чтобы не влипнуть
	}
	lr := &io.LimitedReader{R: res.Body, N: limit + 1}

	data, err := io.ReadAll(lr)
	if err != nil {
		return nil, false, err
	}
	truncated := int64(len(data)) > limit
	if truncated {
		data = data[:limit]
	}
	return data, truncated, nil
}
