package worker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/exporter"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// ExportPayload — JSON/payload задачи (см. спецификацию шага 10.3).
type ExportPayload struct {
	ExportID        string
	Owner           string
	Repo            string
	Ref             string
	Format          string // "zip" | "txt" | "md"
	Profile         string
	IncludeGlobs    []string
	ExcludeGlobs    []string
	SecretScan      bool
	SecretStrategy  string
	TokenModel      string // "openai:gpt-4o" и т.п.
	MaxBinarySizeMB int
	TTLHours        int
	IdempotencyKey  string
}

// Deps — зависимости раннера.
type Deps struct {
	GH      *githubclient.Client
	Store   *artifacts.FSStore
	Exports *store.ExportsMem
}

// NewRunner — адаптер под jobs.Runner.
func NewRunner(d Deps) jobs.Runner {
	return func(ctx context.Context, t jobs.Task) error {
		p, ok := t.Payload.(ExportPayload)
		if !ok {
			d.Exports.UpdateStatus(t.ExportID, jobs.StatusError, 0, strPtr("invalid payload"))
			return nil
		}
		if d.Exports.IsCancelRequested(p.ExportID) {
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusCanceled, 0, strPtr("canceled before start"))
			return nil
		}

		d.Exports.UpdateStatus(p.ExportID, jobs.StatusRunning, 5, nil)

		// 1) скачиваем tarball
		rc, err := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
		if err != nil {
			var rle *githubclient.RateLimitedError
			switch {
			case errors.As(err, &rle):
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("rate limited; retry later"))
				return &jobs.RetryableError{After: time.Until(time.Unix(rle.Reset, 0)), Reason: "GitHub rate limited"}
			case errors.Is(err, githubclient.ErrUpstream):
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("upstream error; retry later"))
				return &jobs.RetryableError{After: 2 * time.Second, Reason: "GitHub 5xx"}
			case errors.Is(err, githubclient.ErrNotFound):
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("repository or ref not found"))
				return nil
			default:
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("network error; retry later"))
				return &jobs.RetryableError{After: 2 * time.Second, Reason: "network"}
			}
		}
		defer rc.Close()
		d.Exports.SetProgress(p.ExportID, 20)

		if d.Exports.IsCancelRequested(p.ExportID) || ctx.Err() != nil {
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusCanceled, 0, strPtr("canceled"))
			return nil
		}

		// 2) создаём сам файл артефакта
		var ext, name string
		switch strings.ToLower(p.Format) {
		case "zip":
			ext, name = "zip", "bundle.zip"
		case "txt":
			ext, name = "txt", "concat.txt"
		case "md":
			ext, name = "zip", "promptpack.zip" // prompt pack — zip с md-файлами
		default:
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("unknown format"))
			return nil
		}

		aw, meta, err := d.Store.CreateArtifact(p.ExportID, ext, name)
		if err != nil {
			d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("cannot create artifact"))
			return nil
		}
		defer aw.Close() // по Close() manifest.json обновится с size

		// 3) строим содержимое
		d.Exports.SetProgress(p.ExportID, 45)

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
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("build zip failed; retry"))
				return &jobs.RetryableError{After: 2 * time.Second, Reason: "build-zip"}
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
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusError, 0, strPtr("too_large"))
					return nil
				}
				d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("build txt failed; retry"))
				return &jobs.RetryableError{After: 2 * time.Second, Reason: "build-txt"}
			}

		case "md":
			ppOpts := exporter.PromptPackOptions{
				Owner:           p.Owner,
				Repo:            p.Repo,
				Ref:             p.Ref,
				Profile:         exporter.Profile(strings.Title(p.Profile)),
				ModelID:         p.TokenModel,
				IncludeGlobs:    p.IncludeGlobs,
				ExcludeGlobs:    p.ExcludeGlobs,
				MaxLinesPerFile: 0,
				MaskSecrets:     p.SecretScan,
			}
			if err := exporter.BuildPromptPackFromTarGz(rc, aw, ppOpts); err != nil {
				if nsp, ok := err.(*exporter.NeedSecondPassError); ok {
					rc2, e2 := d.GH.GetTarball(ctx, p.Owner, p.Repo, p.Ref)
					if e2 != nil {
						d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("need second pass; tarball retry"))
						return &jobs.RetryableError{After: 2 * time.Second, Reason: "tarball-2nd"}
					}
					defer rc2.Close()
					if e := exporter.FillSecondPassExcerpts(rc2, nsp); e != nil {
						d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("second pass failed; retry"))
						return &jobs.RetryableError{After: 2 * time.Second, Reason: "pp-second-pass"}
					}
				} else {
					d.Exports.UpdateStatus(p.ExportID, jobs.StatusQueued, 0, strPtr("promptpack build failed; retry"))
					return &jobs.RetryableError{After: 2 * time.Second, Reason: "promptpack"}
				}
			}
		}

		d.Exports.SetProgress(p.ExportID, 95)
		d.Exports.AddArtifact(p.ExportID, store.ArtifactMeta{
			ID:   meta.ID,
			Kind: meta.Kind,
			Size: meta.Size, // на Close() в manifest запишется реальный размер
		})
		d.Exports.UpdateStatus(p.ExportID, jobs.StatusDone, 100, nil)
		return nil
	}
}

func strPtr(s string) *string { return &s }

func CalcIdemKey(owner, repo, ref, format, profile string, include, exclude []string, secretScan bool, strategy, tokenModel, exporterVersion string) string {
	h := sha256.New()
	io.WriteString(h, strings.Join([]string{
		owner, repo, ref, format, profile,
		strings.Join(include, ","),
		strings.Join(exclude, ","),
		fmt.Sprintf("sec=%v,strat=%s,model=%s,ver=%s", secretScan, strategy, tokenModel, exporterVersion),
	}, "|"))
	return hex.EncodeToString(h.Sum(nil))
}
