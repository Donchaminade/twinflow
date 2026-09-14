// Package store defines the storage contracts used by the engine.
// Primary is the source of truth; Mirror is a local, eventually-consistent copy.
package store

import (
	"context"
	"time"
)

type Row map[string]any

type Result struct {
	Columns      []string
	Rows         []Row
	RowsAffected int64
}

type Column struct {
	Name     string
	PGType   string
	Nullable bool
}

type TableSchema struct {
	Name    string
	Columns []Column
	PK      string
}

type Watermark struct {
	Time time.Time
	PK   string
}

type Primary interface {
	Ping(ctx context.Context) error
	Query(ctx context.Context, sql string, args []any) (Result, error)
	Exec(ctx context.Context, sql string, args []any) (Result, error)
	Schema(ctx context.Context, table string) (TableSchema, error)
	FetchIncremental(ctx context.Context, table string, watermarkCol, pk string, after Watermark, limit int) ([]Row, error)
	ListPKs(ctx context.Context, table, pk string) ([]string, error)
	PoolStats() PoolStats
	Close()
}

type Mirror interface {
	Ready() bool
	Lag() time.Duration
	LastError() string
	LastSync() time.Time
	EnsureTable(schema TableSchema) error
	Query(ctx context.Context, sql string, args []any) (Result, error)
	Upsert(table TableSchema, row Row) error
	DeletePK(table TableSchema, pk string) error
	SetWatermark(table string, wm Watermark) error
	Watermark(table string) (Watermark, bool)
	MarkSynced(at time.Time, err error)
	Count(table string) (int64, error)
	Close() error
}

type PoolStats struct {
	Acquired    int32 `json:"acquired"`
	Idle        int32 `json:"idle"`
	MaxConns    int32 `json:"max_conns"`
	Constructed int32 `json:"constructed"`
}
