package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/httpserver"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config error", slog.String("error", err.Error()))
		os.Exit(1)
	}

	addr := ":" + cfg.Port
	h := httpserver.New(cfg)
	slog.Info("starting http server", slog.String("addr", addr), slog.String("env", string(cfg.Env)), slog.Duration("timeout", cfg.RequestTimeout))
	// Стартуем блокирующе. Если сервер завершился с ошибкой — фатал.
	// (Позже заменим на http.Server + Shutdown(ctx) для graceful).
	if err := http.ListenAndServe(addr, h); err != nil {
		slog.Error("server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}

}
