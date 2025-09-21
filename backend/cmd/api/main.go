package main

import (
	"log"
	"net/http"

	"github.com/yourname/cleanhttp/internal/config"
	"github.com/yourname/cleanhttp/internal/httpserver"
)

func main(){
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}	

	addr := ":" + cfg.Port
	h := httpserver.New(cfg)
	log.Printf("starting http server on %s (env=%s, timeout=%s)", addr, cfg.Env, cfg.RequestTimeout)
	// Стартуем блокирующе. Если сервер завершился с ошибкой — фатал.
	// (Позже заменим на http.Server + Shutdown(ctx) для graceful).
	if err := http.ListenAndServe(addr, h); err != nil {
		log.Fatalf("server stopped: %v", err)
	}

}