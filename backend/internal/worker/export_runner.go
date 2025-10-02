package worker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
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
	Store       artifacts.ArtifactsStore
	Exports     store.ExportsStore
	MaxAttempts int
	Logger      *slog.Logger
}

// NewRunner — адаптер под jobs.Runner.
func NewRunner(d Deps) jobs.Runner {
	return func(ctx context.Context, t jobs.Task) error {
		p, ok := t.Payload.(ExportPayload)
		if !ok {
			logger := defaultLogger(d.Logger)
			logger.Error("invalid payload", slog.String("exportId", t.ExportID))
			d.Exports.UpdateStatus(t.ExportID, jobs.StatusError, 0, strPtr("invalid_payload"))
			return nil
		}
		if d.MaxAttempts <= 0 {
			d.MaxAttempts = 3
		}
		jobLog := loggerFor(d.Logger, p, t.Attempt)
		jobLog.Info("export started",
			slog.String("owner", p.Owner),
			slog.String("repo", p.Repo),
			slog.String("ref", p.Ref),
			slog.String("format", strings.ToLower(strings.TrimSpace(p.Format))),
			slog.String("profile", p.Profile),
		)

		format := normalizeFormat(p.Format)

		// Создаём writer для артефакта (FSStore.CreateArtifact)
		fileName := artifactFileName(format)
		aw, meta, err := d.Store.CreateArtifact(p.ExportID, format, fileName)
		if err != nil {
			jobLog.Error("cannot create artifact writer", slog.String("file", fileName), slog.String("error", err.Error()))
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("artifact_write_failed"))
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
		if checkCancellation(ctx, d, p, jobLog, "before_tarball") {
			return nil
		}

		rc, err := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
		if err != nil {
			var rle *githubclient.RateLimitedError
			switch {
			case errors.As(err, &rle):
				jobLog.Warn("github rate limited",
					slog.Int64("reset", rle.Reset),
					slog.String("error", err.Error()),
				)
				delay := time.Until(time.Unix(rle.Reset, 0))
				if delay < time.Second {
					delay = time.Second
				}
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "github_rate_limited", delay)

			case errors.Is(err, githubclient.ErrUpstream):
				jobLog.Warn("github upstream error",
					slog.String("error", err.Error()),
				)
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "github_upstream_error", 2*time.Second)

			case errors.Is(err, githubclient.ErrNotFound):
				jobLog.Info("repository or ref not found", slog.String("error", err.Error()))
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("github_not_found"))
				return nil

			default:
				jobLog.Warn("github tarball network error", slog.String("error", err.Error()))
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "github_network_error", 2*time.Second)
			}
		}

		// --- Новый блок: стримим tarball во временный файл с прогрессом ---
		tmpf, e := os.CreateTemp("", "tarball-*.tgz")
		if e != nil {
			jobLog.Error("cannot create temp file", slog.String("error", e.Error()))
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("temp_file_create_failed"))
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
			if checkCancellation(ctx, d, p, jobLog, "download_tarball") {
				_ = rc.Close()
				return nil
			}
			if written >= capBytes {
				jobLog.Warn("tarball too large", slog.Int("limitMB", maxDownloadMB))
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
					jobLog.Error("tarball write error", slog.String("error", werr.Error()))
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("tarball_write_error"))
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
				jobLog.Warn("tarball read error", slog.String("error", rerr.Error()))
				_ = rc.Close()
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "tarball_read_error", 2*time.Second)
			}
		}

		if err := rc.Close(); err != nil {
			jobLog.Warn("tarball close error", slog.String("error", err.Error()))
			// не фатально для нас — продолжаем
		}

		if _, err := tmpf.Seek(0, io.SeekStart); err != nil {
			jobLog.Error("temp file seek error", slog.String("error", err.Error()))
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("temp_file_seek_failed"))
			return nil
		}
		// заменяем rc на файл, дальше читаем из диска
		rc = tmpf
		// завершили скачивание — переходим к следующему этапу
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, 32, nil)
		// --- Конец нового блока ---

		if checkCancellation(ctx, d, p, jobLog, "before_build") {
			return nil
		}

		switch format {
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
					jobLog.Warn("zip export too large")
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				jobLog.Warn("zip build failed", slog.String("error", err.Error()))
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "zip_build_failed", 2*time.Second)
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
					jobLog.Warn("txt export too large")
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				jobLog.Warn("txt build failed", slog.String("error", err.Error()))
				return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "txt_build_failed", 2*time.Second)
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
					jobLog.Info("promptpack requires second pass")

					rc2, e2 := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
					if e2 != nil {
						jobLog.Warn("promptpack second pass tarball error", slog.String("error", e2.Error()))
						return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "promptpack_second_pass_tarball", 2*time.Second)
					}
					defer rc2.Close()

					if e := exporter.FillSecondPassExcerpts(rc2, need); e != nil {
						jobLog.Warn("promptpack second pass failed", slog.String("error", e.Error()))
						return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "promptpack_second_pass_failed", 2*time.Second)
					}
				} else {
					jobLog.Warn("promptpack build failed", slog.String("error", err.Error()))
					return retryOrFail(d, jobLog, p, t.Attempt, d.MaxAttempts, "promptpack_build_failed", 2*time.Second)
				}
			}

		default:
			jobLog.Error("unknown export format")
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("unknown_format"))
			return nil
		}

		if err := aw.Close(); err != nil {
			jobLog.Error("artifact finalize error", slog.String("error", err.Error()))
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("artifact_finalize_failed"))
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
		jobLog.Info("export completed",
			slog.String("artifactId", meta.ID),
			slog.String("artifactKind", meta.Kind),
			slog.Int64("artifactSize", meta.Size),
		)
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusDone, 100, nil)
		return nil
	}
}

// retryOrFail — простая стратегия повторов. (Очередь сама решает политику ретраев)
func retryOrFail(d Deps, log *slog.Logger, p ExportPayload, attempt, max int, failureReason string, delay time.Duration) error {
	if delay <= 0 {
		delay = 2 * time.Second
	}
	if attempt+1 >= max {
		log.Error("retry attempts exhausted", slog.String("failureReason", failureReason))
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr(failureReason))
		return nil
	}
	log.Warn("retry scheduled", slog.String("failureReason", failureReason), slog.Duration("delay", delay))
	return &jobs.RetryableError{After: delay, Reason: failureReason}
}

func defaultLogger(lg *slog.Logger) *slog.Logger {
	if lg != nil {
		return lg
	}
	return slog.Default()
}

func loggerFor(lg *slog.Logger, p ExportPayload, attempt int) *slog.Logger {
	base := defaultLogger(lg).With(
		slog.String("exportId", p.ExportID),
		slog.String("idemKey", p.IdempotencyKey),
		slog.Int("attempt", attempt+1),
		slog.String("format", strings.ToLower(strings.TrimSpace(p.Format))),
		slog.String("profile", p.Profile),
	)
	if p.Owner != "" {
		base = base.With(slog.String("owner", p.Owner))
	}
	if p.Repo != "" {
		base = base.With(slog.String("repo", p.Repo))
	}
	if p.Ref != "" {
		base = base.With(slog.String("ref", p.Ref))
	}
	return base
}

func checkCancellation(ctx context.Context, d Deps, p ExportPayload, log *slog.Logger, stage string) bool {
	select {
	case <-ctx.Done():
		log.Warn("context cancelled", slog.String("stage", stage))
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusCancelled, -1, strPtr("context_cancelled"))
		return true
	default:
	}
	if d.Exports.IsCancelRequested(p.ExportID) {
		log.Info("cancel requested", slog.String("stage", stage))
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusCancelled, -1, strPtr("user_cancelled"))
		return true
	}
	return false
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

func normalizeFormat(format string) string {
	f := strings.ToLower(strings.TrimSpace(format))
	if f == "" {
		return "zip"
	}
	if f == "promptpack" {
		return "md"
	}
	return f
}

// artifactFileName — безопасное имя файла артефакта.
func artifactFileName(format string) string {
	switch format {
	case "zip":
		return "bundle.zip"
	case "txt":
		return "bundle.txt"
	case "md", "promptpack":
		return "promptpack.zip"
	default:
		return "artifact.bin"
	}
}
