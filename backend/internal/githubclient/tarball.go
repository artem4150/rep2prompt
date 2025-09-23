package githubclient

import (
	"context"
	"fmt"
	"io"
	"net/http"
	_"strconv"
	"strings"
	"time"
)


type bodyWithCancel struct {
    io.ReadCloser
    cancel context.CancelFunc
}

func (b *bodyWithCancel) Close() error {
    if b.cancel != nil {
        b.cancel()
    }
    return b.ReadCloser.Close()
}

// GetTarball получает .tar.gz (gzip-стрим) по ветке/тегу/коммиту.
// Возвращает поток res.Body — ОБЯЗАТЕЛЬНО закрыть вызывающему.
// GetTarball скачивает архив репозитория (tar.gz) для указанного owner/repo/ref.
// Возвращает io.ReadCloser потока (НЕ забудь закрыть), а также http.StatusCode.
// Клиент по умолчанию сам последует 302 на codeload.github.com.
func (c *Client) GetTarball(ctx context.Context, owner, repo, ref string) (io.ReadCloser, error) {
    if ref == "" {
        ref = "HEAD"
    }

    dlTimeout := 10 * time.Minute
    if dl, ok := ctx.Deadline(); ok {
        if left := time.Until(dl); left > 0 && left < dlTimeout {
            dlTimeout = left
        }
    }
    tctx, cancel := context.WithTimeout(ctx, dlTimeout) // НЕ делаем defer cancel()

    path := fmt.Sprintf("/repos/%s/%s/tarball/%s", owner, repo, ref)
    req, err := http.NewRequestWithContext(tctx, http.MethodGet, c.BaseURL+ensureLeadingSlash(path), nil)
    if err != nil {
        cancel()
        return nil, err
    }
    req.Header.Set("Accept", "application/vnd.github+json")
    if c.Token != "" {
        req.Header.Set("Authorization", "Bearer "+c.Token)
    }

    res, err := c.Doer.Do(req)
    if err != nil {
        cancel()
        return nil, err
    }

    // rate limit
    if (res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusTooManyRequests) &&
        strings.TrimSpace(res.Header.Get("X-RateLimit-Remaining")) == "0" {
        var reset int64
        fmt.Sscanf(res.Header.Get("X-RateLimit-Reset"), "%d", &reset)
        io.Copy(io.Discard, res.Body)
        res.Body.Close()
        cancel()
        return nil, &RateLimitedError{Reset: reset}
    }

    if res.StatusCode >= 200 && res.StatusCode < 300 {
        // Возвращаем тело, связанное с cancel — он вызовется на Close()
        return &bodyWithCancel{ReadCloser: res.Body, cancel: cancel}, nil
    }

    // Ошибочные коды
    io.Copy(io.Discard, res.Body)
    res.Body.Close()
    cancel()
    switch {
    case res.StatusCode == http.StatusNotFound:
        return nil, ErrNotFound
    case res.StatusCode >= 500:
        return nil, ErrUpstream
    default:
        return nil, fmt.Errorf("unexpected status: %d", res.StatusCode)
    }
}
