package worker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/exporter"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// ExportPayload — полезная нагрузка задачи экспорта.
type ExportPayload struct {
	ExportID        string
	Owner           string
	Repo            string
	Ref             string
	Format          string // "zip" | "txt" | "md" (promptpack)
	Profile         string // short | full | rag (для promptpack)
	TokenModel      string // id модели токенов для budget/оценки
	IncludeGlobs    []string
	ExcludeGlobs    []string
	MaxBinarySizeMB int
	SecretScan      bool

	// поля, на которые ссылаются хэндлеры async-экспорта
	SecretStrategy string
	TTLHours       int
	IdempotencyKey string
}

// Deps — зависимости раннера.
type Deps struct {
	GH          *githubclient.Client
	Store       *artifacts.FSStore
	Exports     *store.ExportsMem
	MaxAttempts int
	Logger      *log.Logger
}

// NewRunner — адаптер под jobs.Runner.
func NewRunner(d Deps) jobs.Runner {
	return func(ctx context.Context, t jobs.Task) error {
		lg := d.Logger
		if lg == nil {
			lg = log.Default()
		}

		p, ok := t.Payload.(ExportPayload)
		if !ok {
			d.Exports.UpdateStatus(t.ExportID, jobs.StatusError, 0, strPtr("invalid payload"))
			return nil
		}
		if d.MaxAttempts <= 0 {
			d.MaxAttempts = 3
		}

		lg.Printf("export %s: start (attempt=%d) owner=%s repo=%s ref=%s format=%s profile=%s",
			p.ExportID, t.Attempt+1, p.Owner, p.Repo, p.Ref, strings.ToLower(p.Format), p.Profile)

		// Создаём writer для артефакта (FSStore.CreateArtifact)
		fileName := artifactFileName(p)
		aw, meta, err := d.Store.CreateArtifact(p.ExportID, strings.ToLower(p.Format), fileName)
		if err != nil {
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("cannot create artifact writer"))
			return nil
		}
		closed := false
		defer func() {
			if !closed {
				_ = aw.Close()
			}
		}()

		d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, 10, nil)

		// 1) скачиваем tarball
		rc, err := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
		if err != nil {
			var rle *githubclient.RateLimitedError
			switch {
			case errors.As(err, &rle):
				lg.Printf("export %s: tarball rate-limited (attempt=%d) reset=%d err=%v",
					p.ExportID, t.Attempt+1, rle.Reset, err)
				delay := time.Until(time.Unix(rle.Reset, 0))
				if delay < time.Second {
					delay = time.Second
				}
				return retryOrFail("rate limited; retry later", "GitHub rate limited", delay)

			case errors.Is(err, githubclient.ErrUpstream):
				lg.Printf("export %s: tarball upstream 5xx (attempt=%d) err=%v",
					p.ExportID, t.Attempt+1, err)
				return retryOrFail("upstream error; retry later", "GitHub 5xx", 2*time.Second)

			case errors.Is(err, githubclient.ErrNotFound):
				lg.Printf("export %s: tarball not found owner=%s repo=%s ref=%s err=%v",
					p.ExportID, p.Owner, p.Repo, p.Ref, err)
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("repository or ref not found"))
				return nil

			default:
				lg.Printf("export %s: tarball network error (attempt=%d) err=%v",
					p.ExportID, t.Attempt+1, err)
				return retryOrFail("network error; retry later", "network", 2*time.Second)
			}
		}

		// --- Новый блок: стримим tarball во временный файл с прогрессом ---
		tmpf, e := os.CreateTemp("", "tarball-*.tgz")
		if e != nil {
			lg.Printf("export %s: cannot create temp file: %v", p.ExportID, e)
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("cannot create temp file"))
			_ = rc.Close()
			return nil
		}
		tmpPath := tmpf.Name()
		defer func() {
			_ = tmpf.Close()
			_ = os.Remove(tmpPath)
		}()

		const maxDownloadMB = 512 // лимит размера архива
		const tickMB = 10         // шаг прогресса

		buf := make([]byte, 1<<20) // 1 МБ
		var (
			written  int64
			nextTick int64 = tickMB * (1 << 20)
			capBytes       = int64(maxDownloadMB) * (1 << 20)
		)

		// прогресс «Скачивание»: 12..30%
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, 12, nil)

		for {
			if written >= capBytes {
				lg.Printf("export %s: tarball too large (> %d MB)", p.ExportID, maxDownloadMB)
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
				_ = rc.Close()
				return nil
			}
			readCap := len(buf)
			if rem := capBytes - written; int64(readCap) > rem {
				readCap = int(rem)
			}

			n, rerr := rc.Read(buf[:readCap])
			if n > 0 {
				if _, werr := tmpf.Write(buf[:n]); werr != nil {
					lg.Printf("export %s: tarball write error: %v", p.ExportID, werr)
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("write error"))
					_ = rc.Close()
					return nil
				}
				written += int64(n)

				if written >= nextTick {
					prog := 12 + int((written*18)/capBytes) // 12..30
					if prog > 30 {
						prog = 30
					}
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, prog, nil)
					nextTick += tickMB * (1 << 20)
				}
			}

			if rerr != nil {
				if rerr == io.EOF {
					break
				}
				lg.Printf("export %s: tarball read error: %v", p.ExportID, rerr)
				_ = rc.Close()
				return retryOrFail("network error; retry later", "network-read", 2*time.Second)
			}
		}

		if err := rc.Close(); err != nil {
			lg.Printf("export %s: tarball close error: %v", p.ExportID, err)
			// не фатально для нас — продолжаем
		}

		if _, err := tmpf.Seek(0, io.SeekStart); err != nil {
			lg.Printf("export %s: temp seek error: %v", p.ExportID, err)
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("temp file seek error"))
			return nil
		}
		// заменяем rc на файл, дальше читаем из диска
		rc = tmpf
		// завершили скачивание — переходим к следующему этапу
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, 32, nil)
		// --- Конец нового блока ---

		switch strings.ToLower(p.Format) {
		case "zip":
			opts := exporter.Options{
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				MaxBinarySizeMB: p.MaxBinarySizeMB,
				MaxExportMB:     200,
				MaxFilenameLen:  255,
				StripFirstDir:   true,
			}
			if err := exporter.BuildZipFromTarGz(rc, aw, opts); err != nil {
				if err == exporter.ErrExportTooLarge {
					lg.Printf("export %s: build zip too_large", p.ExportID)
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				lg.Printf("export %s: build zip failed (attempt=%d) err=%v", p.ExportID, t.Attempt+1, err)
				return retryOrFail("build zip failed; retry", "build-zip", 2*time.Second)
			}

		case "txt":
			topts := exporter.TxtOptions{
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				StripFirstDir:   true,
				LineNumbers:     true,
				HeaderTemplate:  "=== FILE: {path} (first {n} lines) ===",
				MaxLinesPerFile: 10000,
				MaxExportMB:     200,
				SkipBinaries:    true,
			}
			if err := exporter.BuildTxtFromTarGz(rc, aw, topts); err != nil {
				if err == exporter.ErrExportTooLarge {
					lg.Printf("export %s: build txt too_large", p.ExportID)
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				lg.Printf("export %s: build txt failed (attempt=%d) err=%v", p.ExportID, t.Attempt+1, err)
				return retryOrFail("build txt failed; retry", "build-txt", 2*time.Second)
			}

		case "md":
			ppOpts := exporter.PromptPackOptions{
				Owner:           p.Owner,
				Repo:            p.Repo,
				Ref:             p.Ref,
				Profile:         promptPackProfile(p.Profile),
				ModelID:         p.TokenModel,
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				MaxLinesPerFile: 0,
				MaskSecrets:     p.SecretScan,
				StripFirstDir:   true,
			}
			if err := exporter.BuildPromptPackFromTarGz(rc, aw, ppOpts); err != nil {
				// Требуется второй проход
				if need, ok := err.(*exporter.NeedSecondPassError); ok {
					lg.Printf("export %s: promptpack need second pass", p.ExportID)

					rc2, e2 := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
					if e2 != nil {
						lg.Printf("export %s: second pass tarball error (attempt=%d) err=%v",
							p.ExportID, t.Attempt+1, e2)
						return retryOrFail("need second pass; tarball retry", "tarball-2nd", 2*time.Second)
					}
					defer rc2.Close()

					if e := exporter.FillSecondPassExcerpts(rc2, need); e != nil {
						lg.Printf("export %s: second pass failed (attempt=%d) err=%v",
							p.ExportID, t.Attempt+1, e)
						return retryOrFail("second pass failed; retry", "pp-second-pass", 2*time.Second)
					}
				} else {
					lg.Printf("export %s: promptpack build failed (attempt=%d) err=%v",
						p.ExportID, t.Attempt+1, err)
					return retryOrFail("promptpack build failed; retry", "promptpack", 2*time.Second)
				}
			}

		default:
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("unknown format"))
			return nil
		}

		if err := aw.Close(); err != nil {
			lg.Printf("export %s: artifact finalize error err=%v", p.ExportID, err)
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("cannot finalize artifact"))
			return nil
		}
		closed = true

		// после Close() метаданные обновились — перечитаем из writer
		meta = aw.Meta()

		d.Exports.AddArtifact(p.ExportID, store.ArtifactMeta{
			ID:   meta.ID,
			Kind: meta.Kind,
			Size: meta.Size,
		})
		lg.Printf("export %s: done artifact=%s kind=%s size=%dB", p.ExportID, meta.ID, meta.Kind, meta.Size)
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusDone, 100, nil)
		return nil
	}
}

// retryOrFail — простая стратегия повторов. (Очередь сама решает политику ретраев)
func retryOrFail(msg, _ string, delay time.Duration) error {
	if delay <= 0 {
		delay = 2 * time.Second
	}
	return fmt.Errorf("%s", msg)
}

// hashID — утилита для стабильных идентификаторов.
func hashID(parts ...string) string {
	h := sha256.New()
	for _, p := range parts {
		h.Write([]byte(p))
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func strPtr(s string) *string { return &s }

// CalcIdemKey — детерминированный ключ идемпотентности.
func CalcIdemKey(owner, repo, ref, format, profile string, inc, exc []string, secretScan bool, secretStrategy, tokenModel, version string) string {
	parts := []string{
		"v=" + version,
		"o=" + strings.ToLower(owner),
		"r=" + strings.ToLower(repo),
		"ref=" + ref,
		"f=" + format,
		"p=" + profile,
		"scan=" + fmt.Sprint(secretScan),
		"strat=" + strings.ToUpper(secretStrategy),
		"model=" + tokenModel,
	}
	if len(inc) > 0 {
		parts = append(parts, "inc="+strings.Join(inc, ","))
	}
	if len(exc) > 0 {
		parts = append(parts, "exc="+strings.Join(exc, ","))
	}
	return hashID(parts...)
}

func promptPackProfile(profile string) exporter.Profile {
	switch strings.ToLower(profile) {
	case "full":
		return exporter.ProfileFull
	case "rag":
		return exporter.ProfileRAG
	default:
		return exporter.ProfileShort
	}
}

// artifactFileName — безопасное имя файла артефакта.
func artifactFileName(p ExportPayload) string {
	switch strings.ToLower(p.Format) {
	case "zip":
		return "bundle.zip"
	case "txt":
		return "bundle.txt"
	case "md": // Prompt Pack собирается в архив
		return "promptpack.zip"
	default:
		return "artifact.bin"
	}
}
