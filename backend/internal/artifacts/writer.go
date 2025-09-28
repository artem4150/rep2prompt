package artifacts

import (
	"io"
	"sync"
)

type finalizeFunc func(meta ArtifactMeta, size int64) (ArtifactMeta, error)

// ArtifactWriter — io.WriteCloser, который обновляет метаданные в хранилище
// при закрытии. Конкретное хранилище передает колбэк finalize, который
// выполняет завершающие действия (обновление manifest, загрузка в S3 и т.д.).
type ArtifactWriter struct {
	wc       io.WriteCloser
	finalize finalizeFunc

	mu     sync.Mutex
	meta   ArtifactMeta
	size   int64
	closed bool
}

func newArtifactWriter(w io.WriteCloser, meta ArtifactMeta, finalize finalizeFunc) *ArtifactWriter {
	return &ArtifactWriter{wc: w, finalize: finalize, meta: meta}
}

// Write проксирует запись в базовый writer и учитывает количество записанных байт.
func (aw *ArtifactWriter) Write(p []byte) (int, error) {
	n, err := aw.wc.Write(p)
	if n > 0 {
		aw.mu.Lock()
		aw.size += int64(n)
		aw.mu.Unlock()
	}
	return n, err
}

// Close закрывает writer и вызывает finalize. При успешном завершении meta
// обновляется на актуальные значения (например, с обновленным размером).
func (aw *ArtifactWriter) Close() error {
	aw.mu.Lock()
	if aw.closed {
		aw.mu.Unlock()
		return nil
	}
	aw.closed = true
	size := aw.size
	aw.mu.Unlock()

	if err := aw.wc.Close(); err != nil {
		return err
	}

	meta, err := aw.finalize(aw.meta, size)
	if err != nil {
		return err
	}

	aw.mu.Lock()
	aw.meta = meta
	aw.mu.Unlock()
	return nil
}

// Meta возвращает последнюю известную мету артефакта.
func (aw *ArtifactWriter) Meta() ArtifactMeta {
	aw.mu.Lock()
	defer aw.mu.Unlock()
	return aw.meta
}
