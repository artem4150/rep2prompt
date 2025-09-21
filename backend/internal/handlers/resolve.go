package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/yourname/cleanhttp/internal/githubclient"
	"github.com/yourname/cleanhttp/internal/httputil"
)

type ResolveHandler struct{ GH *githubclient.Client }
func NewResolveHandler(gh *githubclient.Client) *ResolveHandler { return &ResolveHandler{GH: gh} }

type resolveReq struct{ URL string `json:"url"` }
type resolveResp struct {
	Owner, Repo, DefaultRef string
	Refs                    []string
}

func (h *ResolveHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST is allowed", nil)
		return
	}

	var in resolveReq
	if err := httputil.DecodeJSON(r, &in); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid JSON body", map[string]any{"error": err.Error()})
		return
	}
	if in.URL == "" {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "url is required", nil)
		return
	}

	owner, repo, err := githubclient.ParseGitHubURL(in.URL)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "bad_request", "invalid GitHub URL", map[string]any{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	branch, err := h.GH.GetDefaultBranch(ctx, owner, repo)
	if err != nil {
		if rl, ok := err.(*githubclient.RateLimitedError); ok {
			httputil.WriteError(w, http.StatusTooManyRequests, "rate_limited", "GitHub API rate limited", map[string]any{"reset": rl.Reset})
			return
		}
		if err == githubclient.ErrNotFound {
			httputil.WriteError(w, http.StatusNotFound, "not_found", "repository not found", nil)
			return
		}
		if err == githubclient.ErrUpstream {
			httputil.WriteError(w, http.StatusBadGateway, "upstream_error", "GitHub upstream error", nil)
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "internal_error", "internal error", map[string]any{"error": err.Error()})
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resolveResp{
		Owner: owner, Repo: repo, DefaultRef: branch, Refs: []string{branch},
	})
}
