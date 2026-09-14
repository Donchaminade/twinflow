package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadRequiresPrimaryURL(t *testing.T) {
	t.Setenv("TWINFLOW_PRIMARY_URL", "")
	_, err := Load("")
	if err == nil {
		t.Fatal("expected missing url error")
	}
}

func TestEnvOverridesYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "tf.yaml")
	if err := os.WriteFile(path, []byte(`
listen: ":1"
regulator:
  rate_limit_rps: 1
tables:
  - name: products
    fresh: false
    sync: true
`), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("TWINFLOW_PRIMARY_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("TWINFLOW_LISTEN", ":8741")
	t.Setenv("TWINFLOW_SEED_SQL", "examples/init.sql")
	t.Setenv("TWINFLOW_RATE_LIMIT_RPS", "42")
	t.Setenv("TWINFLOW_FRESH_TABLES", "products")
	t.Setenv("TWINFLOW_SYNC_INTERVAL", "2s")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != ":8741" {
		t.Fatalf("listen=%s", cfg.Listen)
	}
	if cfg.Regulator.RateLimitRPS != 42 {
		t.Fatalf("rps=%v", cfg.Regulator.RateLimitRPS)
	}
	if !cfg.IsFresh("products") {
		t.Fatal("products should be fresh via env")
	}
	if cfg.Mirror.SyncInterval != 2*time.Second {
		t.Fatalf("interval=%s", cfg.Mirror.SyncInterval)
	}
	if cfg.APIToken != "" {
		t.Fatal("token must not come from yaml")
	}
	if cfg.SeedSQL != "examples/init.sql" {
		t.Fatalf("seed=%s", cfg.SeedSQL)
	}
}

func TestListenFallsBackToPORT(t *testing.T) {
	t.Setenv("TWINFLOW_PRIMARY_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("TWINFLOW_LISTEN", "")
	t.Setenv("PORT", "10000")
	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != "0.0.0.0:10000" {
		t.Fatalf("listen=%s", cfg.Listen)
	}
}

func TestListenPrefersTWINFLOW_LISTENOverPORT(t *testing.T) {
	t.Setenv("TWINFLOW_PRIMARY_URL", "postgres://u:p@localhost:5432/db")
	t.Setenv("TWINFLOW_LISTEN", "127.0.0.1:8741")
	t.Setenv("PORT", "10000")
	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != "127.0.0.1:8741" {
		t.Fatalf("listen=%s", cfg.Listen)
	}
}

func TestDSNAddsSSLMode(t *testing.T) {
	cfg := defaults()
	cfg.Primary.URL = "postgres://u:p@h/db"
	cfg.Primary.TLSMode = "require"
	if cfg.DSN() != "postgres://u:p@h/db?sslmode=require" {
		t.Fatalf("dsn=%s", cfg.DSN())
	}
}
