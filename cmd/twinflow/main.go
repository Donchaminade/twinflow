package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/twinflow/twinflow/internal/api"
	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/engine"
	"github.com/twinflow/twinflow/internal/logx"
	"github.com/twinflow/twinflow/internal/mirror"
	"github.com/twinflow/twinflow/internal/primary"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "twinflow: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfgPath := flag.String("config", envOr("TWINFLOW_CONFIG", "configs/twinflow.yaml"), "path to YAML config")
	flag.Parse()

	log := logx.New(envOr("TWINFLOW_LOG_LEVEL", "info"))
	cfg, err := config.Load(*cfgPath)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	openCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	pg, err := primary.Open(openCtx, cfg)
	if err != nil {
		return err
	}
	defer pg.Close()

	if cfg.SeedSQL != "" {
		if err := pg.ApplySeedFile(openCtx, cfg.SeedSQL); err != nil {
			return fmt.Errorf("apply seed sql: %w", err)
		}
		log.Info("applied seed sql", "path", cfg.SeedSQL)
	}

	mir, err := mirror.Open(cfg.Mirror.Path)
	if err != nil {
		return fmt.Errorf("open mirror: %w", err)
	}
	defer mir.Close()

	syncer := mirror.NewSyncer(cfg, pg, mir, log)
	if err := syncer.Bootstrap(openCtx); err != nil {
		log.Warn("mirror bootstrap degraded; reads will fall back to primary until sync recovers", "err", err)
	}
	go syncer.Run(ctx)

	eng := engine.New(cfg, pg, mir, syncer, log)
	srv := api.New(cfg, eng, log)
	log.Info("twinflow starting",
		"version", engine.Version,
		"listen", cfg.Listen,
		"sync_interval", cfg.Mirror.SyncInterval.String(),
		"tables", len(cfg.Tables),
	)
	return srv.Serve(ctx)
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
