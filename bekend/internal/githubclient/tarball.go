package githubclient

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// GetTarball получает .tar.gz (gzip-стрим) по ветке/тегу/коммиту.
// Возвращает поток res.Body — ОБЯЗАТЕЛЬНО закрыть вызывающему.
func (c *Client) GetTarball(ctx context.Context, owner, repo, ref string) (io.ReadCloser, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/tarball/%s", c.BaseURL, owner, repo, ref)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	// явно просим бинарный поток
	req.Header.Set("Accept", "application/octet-stream")
	req.Header.Set("User-Agent", "cleanhttp/0.1")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	res, err := c.Doer.Do(req)
	if err != nil {
		return nil, err
	}

	// rate-limit: 403/429 с Remaining==0
	if res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusTooManyRequests {
		if strings.TrimSpace(res.Header.Get("X-RateLimit-Remaining")) == "0" {
			var reset int64
			if v := res.Header.Get("X-RateLimit-Reset"); v != "" {
				if n, _ := strconv.ParseInt(v, 10, 64); n > 0 {
					reset = n
				}
			}
			_ = res.Body.Close()
			return nil, &RateLimitedError{Reset: reset}
		}
	}
	if res.StatusCode == http.StatusNotFound {
		_ = res.Body.Close()
		return nil, ErrNotFound
	}
	if res.StatusCode >= 500 {
		_ = res.Body.Close()
		return nil, ErrUpstream
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		_ = res.Body.Close()
		return nil, fmt.Errorf("unexpected status: %d", res.StatusCode)
	}

	// успех: возвращаем поток. Закрывает вызывающий.
	return res.Body, nil
}
