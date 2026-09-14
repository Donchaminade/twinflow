// Package config loads TwinFlow settings from YAML and environment variables.
// Database credentials must come from the environment, never from a committed file.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

const (
	DefaultListen          = ":8741"
	DefaultSyncInterval    = time.Second
	DefaultMaxMirrorLag    = 3 * time.Second
	DefaultReconcileEvery  = 30 * time.Second
	DefaultRateLimitRPS    = 50
	DefaultBurst           = 100
	DefaultWriteQueueSize  = 512
	DefaultWriteTimeout    = 8 * time.Second
	DefaultReadTimeout     = 3 * time.Second
	DefaultMaxConns        = 8
	DefaultMinConns        = 1
	DefaultSyncBatch       = 500
	DefaultMirrorPath      = "data/mirror.db"
	DefaultWatermarkColumn = "updated_at"
	DefaultPKColumn        = "id"
)

// Config is the sidecar runtime configuration.
type Config struct {
	Listen   string `yaml:"listen"`
	LogLevel string `yaml:"log_level"`
	APIToken string `yaml:"-"`
	// SeedSQL is an optional path to idempotent SQL applied on boot (demo schema).
	SeedSQL   string          `yaml:"-"`
	CORS      []string        `yaml:"cors_origins"`
	Primary   PrimaryConfig   `yaml:"primary"`
	Mirror    MirrorConfig    `yaml:"mirror"`
	Regulator RegulatorConfig `yaml:"regulator"`
	Security  SecurityConfig  `yaml:"security"`
	Tables    []TableConfig   `yaml:"tables"`
}

type PrimaryConfig struct {
	// URL is taken from TWINFLOW_PRIMARY_URL only.
	URL      string `yaml:"-"`
	MaxConns int32  `yaml:"max_conns"`
	MinConns int32  `yaml:"min_conns"`
	// TLSMode: disable | prefer | require. Applied when the URL has no sslmode.
	TLSMode string `yaml:"tls_mode"`
}

type MirrorConfig struct {
	Path           string        `yaml:"path"`
	SyncInterval   time.Duration `yaml:"sync_interval"`
	MaxLag         time.Duration `yaml:"max_lag"`
	ReconcileEvery time.Duration `yaml:"reconcile_interval"`
	BatchSize      int           `yaml:"batch_size"`
	Driver         string        `yaml:"driver"` // sqlite (v1)
}

type RegulatorConfig struct {
	RateLimitRPS   float64       `yaml:"rate_limit_rps"`
	Burst          int           `yaml:"burst"`
	WriteQueueSize int           `yaml:"write_queue_size"`
	WriteTimeout   time.Duration `yaml:"write_timeout"`
	ReadTimeout    time.Duration `yaml:"read_timeout"`
}

type SecurityConfig struct {
	// RequireToken rejects unauthenticated API calls when APIToken is set.
	RequireToken bool `yaml:"require_token"`
}

type TableConfig struct {
	Name      string `yaml:"name"`
	Fresh     bool   `yaml:"fresh"`
	Watermark string `yaml:"watermark"`
	PK        string `yaml:"pk"`
	// Sync controls whether the table is copied into the local mirror.
	// Fresh tables can still be synced for observability, but reads go to primary.
	Sync bool `yaml:"sync"`
}

// Load reads a YAML file then applies environment overrides.
func Load(path string) (*Config, error) {
	cfg := defaults()
	if path != "" {
		raw, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read config %s: %w", path, err)
		}
		if err := yaml.Unmarshal(raw, cfg); err != nil {
			return nil, fmt.Errorf("parse config %s: %w", path, err)
		}
	}
	applyEnv(cfg)
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func defaults() *Config {
	return &Config{
		Listen:   DefaultListen,
		LogLevel: "info",
		CORS:     []string{"http://127.0.0.1:43123", "http://localhost:43123"},
		Primary: PrimaryConfig{
			MaxConns: DefaultMaxConns,
			MinConns: DefaultMinConns,
			TLSMode:  "prefer",
		},
		Mirror: MirrorConfig{
			Path:           DefaultMirrorPath,
			SyncInterval:   DefaultSyncInterval,
			MaxLag:         DefaultMaxMirrorLag,
			ReconcileEvery: DefaultReconcileEvery,
			BatchSize:      DefaultSyncBatch,
			Driver:         "sqlite",
		},
		Regulator: RegulatorConfig{
			RateLimitRPS:   DefaultRateLimitRPS,
			Burst:          DefaultBurst,
			WriteQueueSize: DefaultWriteQueueSize,
			WriteTimeout:   DefaultWriteTimeout,
			ReadTimeout:    DefaultReadTimeout,
		},
		Security: SecurityConfig{RequireToken: false},
		Tables: []TableConfig{
			{Name: "products", Fresh: false, Watermark: DefaultWatermarkColumn, PK: DefaultPKColumn, Sync: true},
			{Name: "stock", Fresh: true, Watermark: DefaultWatermarkColumn, PK: "product_id", Sync: true},
			{Name: "orders", Fresh: false, Watermark: DefaultWatermarkColumn, PK: DefaultPKColumn, Sync: true},
		},
	}
}

func applyEnv(cfg *Config) {
	cfg.Primary.URL = strings.TrimSpace(os.Getenv("TWINFLOW_PRIMARY_URL"))
	cfg.APIToken = strings.TrimSpace(os.Getenv("TWINFLOW_API_TOKEN"))
	if v := os.Getenv("TWINFLOW_LISTEN"); v != "" {
		cfg.Listen = v
	} else if v := os.Getenv("PORT"); v != "" {
		// Render and other PaaS inject PORT. Bind all interfaces.
		if strings.Contains(v, ":") {
			cfg.Listen = v
		} else {
			cfg.Listen = "0.0.0.0:" + v
		}
	}
	if v := os.Getenv("TWINFLOW_SEED_SQL"); v != "" {
		cfg.SeedSQL = v
	}
	if v := os.Getenv("TWINFLOW_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("TWINFLOW_MIRROR_PATH"); v != "" {
		cfg.Mirror.Path = v
	}
	if v := os.Getenv("TWINFLOW_TLS_MODE"); v != "" {
		cfg.Primary.TLSMode = v
	}
	if v := os.Getenv("TWINFLOW_CORS_ORIGINS"); v != "" {
		cfg.CORS = splitCSV(v)
	}
	if v := os.Getenv("TWINFLOW_SYNC_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.Mirror.SyncInterval = d
		}
	}
	if v := os.Getenv("TWINFLOW_MAX_MIRROR_LAG"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.Mirror.MaxLag = d
		}
	}
	if v := os.Getenv("TWINFLOW_RATE_LIMIT_RPS"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.Regulator.RateLimitRPS = f
		}
	}
	if v := os.Getenv("TWINFLOW_BURST"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.Regulator.Burst = n
		}
	}
	if v := os.Getenv("TWINFLOW_WRITE_QUEUE_SIZE"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.Regulator.WriteQueueSize = n
		}
	}
	if v := os.Getenv("TWINFLOW_MAX_CONNS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.Primary.MaxConns = int32(n)
		}
	}
	if v := os.Getenv("TWINFLOW_FRESH_TABLES"); v != "" {
		fresh := map[string]struct{}{}
		for _, name := range splitCSV(v) {
			fresh[strings.ToLower(name)] = struct{}{}
		}
		for i := range cfg.Tables {
			_, cfg.Tables[i].Fresh = fresh[strings.ToLower(cfg.Tables[i].Name)]
		}
	}
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (c *Config) Validate() error {
	if c.Primary.URL == "" {
		return fmt.Errorf("TWINFLOW_PRIMARY_URL is required")
	}
	if c.Mirror.SyncInterval <= 0 {
		return fmt.Errorf("mirror.sync_interval must be > 0")
	}
	if c.Mirror.BatchSize <= 0 {
		return fmt.Errorf("mirror.batch_size must be > 0")
	}
	if c.Regulator.RateLimitRPS <= 0 {
		return fmt.Errorf("regulator.rate_limit_rps must be > 0")
	}
	if c.Regulator.WriteQueueSize <= 0 {
		return fmt.Errorf("regulator.write_queue_size must be > 0")
	}
	if c.Primary.MaxConns <= 0 {
		return fmt.Errorf("primary.max_conns must be > 0")
	}
	seen := map[string]struct{}{}
	for i := range c.Tables {
		t := &c.Tables[i]
		t.Name = strings.ToLower(strings.TrimSpace(t.Name))
		if t.Name == "" {
			return fmt.Errorf("tables[%d].name is required", i)
		}
		if _, ok := seen[t.Name]; ok {
			return fmt.Errorf("duplicate table %q", t.Name)
		}
		seen[t.Name] = struct{}{}
		if t.Watermark == "" {
			t.Watermark = DefaultWatermarkColumn
		}
		if t.PK == "" {
			t.PK = DefaultPKColumn
		}
	}
	switch strings.ToLower(c.Primary.TLSMode) {
	case "disable", "prefer", "require":
	default:
		return fmt.Errorf("primary.tls_mode must be disable, prefer, or require")
	}
	return nil
}

func (c *Config) Table(name string) (TableConfig, bool) {
	name = strings.ToLower(name)
	for _, t := range c.Tables {
		if t.Name == name {
			return t, true
		}
	}
	return TableConfig{}, false
}

func (c *Config) IsFresh(name string) bool {
	if t, ok := c.Table(name); ok {
		return t.Fresh
	}
	return false
}

// DSN applies a default sslmode when the URL does not already specify one.
func (c *Config) DSN() string {
	url := c.Primary.URL
	if strings.Contains(strings.ToLower(url), "sslmode=") {
		return url
	}
	sep := "?"
	if strings.Contains(url, "?") {
		sep = "&"
	}
	mode := strings.ToLower(c.Primary.TLSMode)
	if mode == "prefer" {
		mode = "prefer"
	}
	return url + sep + "sslmode=" + mode
}
