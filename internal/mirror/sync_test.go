package mirror

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/store"
)

type memPrimary struct {
	rows    []store.Row
	deleted map[string]bool
}

func (m *memPrimary) Ping(context.Context) error { return nil }
func (m *memPrimary) Query(context.Context, string, []any) (store.Result, error) {
	return store.Result{}, nil
}
func (m *memPrimary) Exec(context.Context, string, []any) (store.Result, error) {
	return store.Result{}, nil
}
func (m *memPrimary) Schema(context.Context, string) (store.TableSchema, error) {
	return store.TableSchema{
		Name: "products",
		PK:   "id",
		Columns: []store.Column{
			{Name: "id", PGType: "integer"},
			{Name: "name", PGType: "text"},
			{Name: "updated_at", PGType: "timestamp with time zone"},
		},
	}, nil
}
func (m *memPrimary) FetchIncremental(_ context.Context, _ string, _, _ string, after store.Watermark, limit int) ([]store.Row, error) {
	var out []store.Row
	for _, r := range m.rows {
		id := fmt.Sprint(r["id"])
		if m.deleted[id] {
			continue
		}
		ts, _ := time.Parse(time.RFC3339Nano, r["updated_at"].(string))
		if ts.After(after.Time) || (ts.Equal(after.Time) && id > after.PK) {
			out = append(out, r)
			if len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}
func (m *memPrimary) ListPKs(context.Context, string, string) ([]string, error) {
	var out []string
	for _, r := range m.rows {
		id := fmt.Sprint(r["id"])
		if !m.deleted[id] {
			out = append(out, id)
		}
	}
	return out, nil
}
func (m *memPrimary) PoolStats() store.PoolStats { return store.PoolStats{} }
func (m *memPrimary) Close()                     {}

func TestIncrementalSyncAndFailoverFlag(t *testing.T) {
	dir := t.TempDir()
	mir, err := Open(filepath.Join(dir, "mirror.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer mir.Close()

	now := time.Now().UTC().Truncate(time.Millisecond)
	p := &memPrimary{
		deleted: map[string]bool{},
		rows: []store.Row{
			{"id": 1, "name": "Beans", "updated_at": now.Format(time.RFC3339Nano)},
			{"id": 2, "name": "Cup", "updated_at": now.Add(time.Second).Format(time.RFC3339Nano)},
		},
	}
	cfg := &config.Config{
		Mirror: config.MirrorConfig{BatchSize: 10, SyncInterval: time.Second, MaxLag: time.Second},
		Tables: []config.TableConfig{{Name: "products", Sync: true, Fresh: false, PK: "id", Watermark: "updated_at"}},
	}
	s := NewSyncer(cfg, p, mir, slog.Default())
	if err := s.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !mir.Ready() {
		t.Fatal("mirror should be ready after bootstrap")
	}
	n, err := mir.Count("products")
	if err != nil || n != 2 {
		t.Fatalf("count=%d err=%v", n, err)
	}

	p.rows = append(p.rows, store.Row{
		"id": 3, "name": "Filter", "updated_at": now.Add(2 * time.Second).Format(time.RFC3339Nano),
	})
	if err := s.syncTable(context.Background(), cfg.Tables[0], false); err != nil {
		t.Fatal(err)
	}
	n, _ = mir.Count("products")
	if n != 3 {
		t.Fatalf("after incremental count=%d", n)
	}

	p.deleted["2"] = true
	if err := s.syncTable(context.Background(), cfg.Tables[0], true); err != nil {
		t.Fatal(err)
	}
	n, _ = mir.Count("products")
	if n != 2 {
		t.Fatalf("after reconcile count=%d", n)
	}

	s.Invalidate(context.Background(), []string{"products"}, []store.Row{
		{"id": 4, "name": "Lid", "updated_at": now.Add(3 * time.Second).Format(time.RFC3339Nano)},
	}, false)
	n, _ = mir.Count("products")
	if n != 3 {
		t.Fatalf("after immediate push count=%d", n)
	}
}

func TestMarkSyncedUnhealthyOnError(t *testing.T) {
	dir := t.TempDir()
	mir, err := Open(filepath.Join(dir, "m.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer mir.Close()
	mir.MarkSynced(time.Now(), os.ErrNotExist)
	if mir.Ready() {
		t.Fatal("expected unhealthy")
	}
	if mir.LastError() == "" {
		t.Fatal("expected last error")
	}
}
