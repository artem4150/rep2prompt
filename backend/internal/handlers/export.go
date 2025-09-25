package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/artifacts"
	"github.com/yourname/cleanhttp/internal/exporter"
	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/httputil"
)

// ExportHandler — синхронный экспорт (оставлен для совместимости).
// Для production-режима рекомендуем использовать /api/export (async).
type ExportHandler struct {
	GH    *githubclient.Client
	Store artifacts.ArtifactsStore
}

func NewExportHandler(gh *githubclient.Client, st artifacts.ArtifactsStore) *ExportHandler {
	return &ExportHandler{GH: gh, Store: st}
}

type exportReq struct {
	Owner           string   `json:"owner"`
	Repo            string   `json:"repo"`
	Ref             string   `json:"ref"`
	Format          string   `json:"format"` // zip|txt|promptpack
	IncludeGlobs    []string `json:"includeGlobs"`
	ExcludeGlobs    []string `json:"excludeGlobs"`
	MaxBinarySizeMB int      `json:"maxBinarySizeMB"`
	Profile         string   `json:"profile"`         // для promptpack
	TreeDepth       int      `json:"treeDepth"`       // (MVP: игнорируется внутри)
	LimitPerDir     int      `json:"limitPerDir"`     // (MVP: игнорируется внутри)
	MaxLinesPerFile int      `json:"maxLinesPerFile"` // для txt/promptpack
	MaskSecrets     bool     `json:"maskSecrets"`
}

type exportResp struct {
	ID string `json:"id"` // artifactId
}

func (h *ExportHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST is allowed", nil)
		return
	}

	var in exportReq
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid JSON body", map[string]any{"error": err.Error()})
		return
	}
	if in.Owner == "" || in.Repo == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "owner and repo are required", nil)
		return
	}
	if in.Ref == "" {
		in.Ref = "main"
	}
	if in.Format == "" {
		in.Format = "zip"
	}

	// 1) Тарболл
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	rc, err := h.GH.GetTarball(ctx, in.Owner, in.Repo, in.Ref)
	if err != nil {
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
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "cannot download tarball", map[string]any{"error": err.Error()})
		return
	}
	defer rc.Close()

	// 2) Создаём артефакт и пишем в него
	switch strings.ToLower(in.Format) {
	case "zip":
		aw, meta, err := h.Store.CreateArtifact("sync-"+time.Now().UTC().Format("20060102T150405"), "zip", "bundle.zip")
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "cannot create artifact", map[string]any{"error": err.Error()})
			return
		}
		defer aw.Close()

		opts := exporter.Options{
			IncludeGlobs:    in.IncludeGlobs,
			ExcludeGlobs:    in.ExcludeGlobs,
			MaxBinarySizeMB: in.MaxBinarySizeMB,
			MaxExportMB:     200,
			MaxFilenameLen:  255,
			StripFirstDir:   true,
		}
		if err := exporter.BuildZipFromTarGz(rc, aw, opts); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to build zip", map[string]any{"error": err.Error()})
			return
		}
		httputil.WriteJSON(w, http.StatusOK, exportResp{ID: meta.ID})
		return

	case "txt":
		aw, meta, err := h.Store.CreateArtifact("sync-"+time.Now().UTC().Format("20060102T150405"), "txt", "concat.txt")
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "cannot create artifact", map[string]any{"error": err.Error()})
			return
		}
		defer aw.Close()

		topts := exporter.TxtOptions{
			IncludeGlobs:    in.IncludeGlobs,
			ExcludeGlobs:    in.ExcludeGlobs,
			StripFirstDir:   true,
			LineNumbers:     true,
			HeaderTemplate:  "=== FILE: {path} (first {n} lines) ===",
			MaxLinesPerFile: 10000,
			MaxExportMB:     200,
			SkipBinaries:    true,
		}
		if in.MaxLinesPerFile > 0 {
			topts.MaxLinesPerFile = in.MaxLinesPerFile
		}
		if err := exporter.BuildTxtFromTarGz(rc, aw, topts); err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to build txt", map[string]any{"error": err.Error()})
			return
		}
		httputil.WriteJSON(w, http.StatusOK, exportResp{ID: meta.ID})
		return

	case "promptpack":
		aw, meta, err := h.Store.CreateArtifact("sync-"+time.Now().UTC().Format("20060102T150405"), "zip", "promptpack.zip")
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "cannot create artifact", map[string]any{"error": err.Error()})
			return
		}
		defer aw.Close()

		pp := exporter.PromptPackOptions{
			Owner:           in.Owner,
			Repo:            in.Repo,
			Ref:             in.Ref,
			Profile:         exporter.Profile(in.Profile),
			TreeDepth:       in.TreeDepth,
			LimitPerDir:     in.LimitPerDir,
			IncludeGlobs:    in.IncludeGlobs,
			ExcludeGlobs:    in.ExcludeGlobs,
			MaxLinesPerFile: in.MaxLinesPerFile,
			MaskSecrets:     in.MaskSecrets,
		}
		if err := exporter.BuildPromptPackFromTarGz(rc, aw, pp); err != nil {
			var need *exporter.NeedSecondPassError
			if errors.As(err, &need) {
				rc2, err2 := h.GH.GetTarball(ctx, in.Owner, in.Repo, in.Ref)
				if err2 != nil {
					httputil.WriteError(w, http.StatusBadGateway, "upstream_error", "cannot re-fetch tarball for excerpts", map[string]any{"error": err2.Error()})
					return
				}
				defer rc2.Close()
				if err := exporter.FillSecondPassExcerpts(rc2, need); err != nil {
					httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to finalize prompt pack", map[string]any{"error": err.Error()})
					return
				}
			} else {
				httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "failed to build prompt pack", map[string]any{"error": err.Error()})
				return
			}
		}
		httputil.WriteJSON(w, http.StatusOK, exportResp{ID: meta.ID})
		return
	}

	httputil.WriteError(w, http.StatusBadRequest, "bad_request", "format must be zip|txt|promptpack", nil)
}
