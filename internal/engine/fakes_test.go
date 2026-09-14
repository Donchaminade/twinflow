package engine

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/twinflow/twinflow/internal/store"
)

type fakePrimary struct {
	mu      sync.Mutex
	tables  map[string][]store.Row
	fail    bool
	queries int
	execs   int
}

func newFakePrimary() *fakePrimary {
	return &fakePrimary{
		tables: map[string][]store.Row{
			"products": {
				{"id": 1, "name": "Espresso", "updated_at": time.Now().UTC().Format(time.RFC3339Nano)},
			},
			"stock": {
				{"product_id": 1, "quantity": 12, "updated_at": time.Now().UTC().Format(time.RFC3339Nano)},
			},
		},
	}
}

func (f *fakePrimary) Ping(ctx context.Context) error {
	if f.fail {
		return fmt.Errorf("primary down")
	}
	return nil
}

func (f *fakePrimary) Query(ctx context.Context, sql string, args []any) (store.Result, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.queries++
	return f.scan(sql), nil
}

func (f *fakePrimary) Exec(ctx context.Context, sql string, args []any) (store.Result, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.execs++
	upper := strings.ToUpper(sql)
	if strings.Contains(upper, "INSERT INTO ORDERS") {
		row := store.Row{"id": f.execs, "product_id": 1, "quantity": 1, "updated_at": time.Now().UTC().Format(time.RFC3339Nano)}
		f.tables["orders"] = append(f.tables["orders"], row)
		return store.Result{Columns: []string{"id", "product_id", "quantity", "updated_at"}, Rows: []store.Row{row}, RowsAffected: 1}, nil
	}
	if strings.Contains(upper, "UPDATE STOCK") {
		for i, row := range f.tables["stock"] {
			f.tables["stock"][i]["quantity"] = 11
			return store.Result{Columns: []string{"product_id", "quantity"}, Rows: []store.Row{row}, RowsAffected: 1}, nil
		}
	}
	return store.Result{RowsAffected: 1}, nil
}

func (f *fakePrimary) Schema(ctx context.Context, table string) (store.TableSchema, error) {
	return store.TableSchema{Name: table, PK: "id", Columns: []store.Column{{Name: "id", PGType: "integer"}}}, nil
}

func (f *fakePrimary) FetchIncremental(ctx context.Context, table, watermarkCol, pk string, after store.Watermark, limit int) ([]store.Row, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.tables[table], nil
}

func (f *fakePrimary) ListPKs(ctx context.Context, table, pk string) ([]string, error) {
	return nil, nil
}

func (f *fakePrimary) PoolStats() store.PoolStats {
	return store.PoolStats{MaxConns: 4}
}

func (f *fakePrimary) Close() {}

func (f *fakePrimary) scan(sql string) store.Result {
	upper := strings.ToUpper(sql)
	name := "products"
	if strings.Contains(upper, "STOCK") {
		name = "stock"
	}
	if strings.Contains(upper, "ORDERS") {
		name = "orders"
	}
	rows := f.tables[name]
	cols := []string{}
	if len(rows) > 0 {
		for k := range rows[0] {
			cols = append(cols, k)
		}
	}
	return store.Result{Columns: cols, Rows: rows, RowsAffected: int64(len(rows))}
}

type fakeMirror struct {
	mu      sync.Mutex
	ready   bool
	lag     time.Duration
	err     string
	last    time.Time
	rows    map[string][]store.Row
	failQ   bool
	queries int
}

func newFakeMirror(ready bool) *fakeMirror {
	return &fakeMirror{
		ready: ready,
		lag:   50 * time.Millisecond,
		last:  time.Now(),
		rows: map[string][]store.Row{
			"products": {
				{"id": 1, "name": "Espresso (mirror)", "updated_at": time.Now().UTC().Format(time.RFC3339Nano)},
			},
		},
	}
}

func (m *fakeMirror) Ready() bool          { return m.ready }
func (m *fakeMirror) Lag() time.Duration   { return m.lag }
func (m *fakeMirror) LastError() string    { return m.err }
func (m *fakeMirror) LastSync() time.Time  { return m.last }
func (m *fakeMirror) EnsureTable(store.TableSchema) error { return nil }
func (m *fakeMirror) Query(ctx context.Context, sql string, args []any) (store.Result, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.queries++
	if m.failQ || !m.ready {
		return store.Result{}, fmt.Errorf("mirror unavailable")
	}
	rows := m.rows["products"]
	return store.Result{Columns: []string{"id", "name"}, Rows: rows, RowsAffected: int64(len(rows))}, nil
}
func (m *fakeMirror) Upsert(schema store.TableSchema, row store.Row) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rows[schema.Name] = append(m.rows[schema.Name], row)
	return nil
}
func (m *fakeMirror) DeletePK(store.TableSchema, string) error { return nil }
func (m *fakeMirror) SetWatermark(string, store.Watermark) error { return nil }
func (m *fakeMirror) Watermark(string) (store.Watermark, bool) { return store.Watermark{}, false }
func (m *fakeMirror) MarkSynced(time.Time, error)               {}
func (m *fakeMirror) Count(string) (int64, error)               { return 1, nil }
func (m *fakeMirror) Close() error                              { return nil }
