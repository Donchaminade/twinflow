package engine

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/mirror"
)

func testEngine(p *fakePrimary, m *fakeMirror) *Engine {
	cfg := &config.Config{
		Mirror: config.MirrorConfig{MaxLag: 3 * time.Second, SyncInterval: time.Second, BatchSize: 50},
		Regulator: config.RegulatorConfig{
			RateLimitRPS: 1000, Burst: 1000, WriteQueueSize: 16,
			WriteTimeout: time.Second, ReadTimeout: time.Second,
		},
		Tables: []config.TableConfig{
			{Name: "products", Fresh: false, Sync: true, PK: "id", Watermark: "updated_at"},
			{Name: "stock", Fresh: true, Sync: true, PK: "product_id", Watermark: "updated_at"},
			{Name: "orders", Fresh: false, Sync: true, PK: "id", Watermark: "updated_at"},
		},
	}
	syncer := mirror.NewSyncer(cfg, p, m, slog.Default())
	return New(cfg, p, m, syncer, slog.Default())
}

func TestReadRoutesToMirror(t *testing.T) {
	p, m := newFakePrimary(), newFakeMirror(true)
	e := testEngine(p, m)
	res, err := e.Query(context.Background(), Request{SQL: "SELECT * FROM products"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Source != "mirror" {
		t.Fatalf("source=%s reason=%s", res.Source, res.Reason)
	}
	if m.queries != 1 || p.queries != 0 {
		t.Fatalf("mirror=%d primary=%d", m.queries, p.queries)
	}
	if len(res.Rows) != 1 || res.Rows[0]["name"] != "Espresso (mirror)" {
		t.Fatalf("rows=%v", res.Rows)
	}
}

func TestFreshReadRoutesToPrimary(t *testing.T) {
	p, m := newFakePrimary(), newFakeMirror(true)
	e := testEngine(p, m)
	res, err := e.Query(context.Background(), Request{SQL: "SELECT * FROM stock"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Source != "primary" || res.Reason != "fresh_table" {
		t.Fatalf("got %+v", res)
	}
	if p.queries != 1 {
		t.Fatalf("primary queries=%d", p.queries)
	}
}

func TestWriteAlwaysPrimaryAndInvalidates(t *testing.T) {
	p, m := newFakePrimary(), newFakeMirror(true)
	e := testEngine(p, m)
	res, err := e.Exec(context.Background(), Request{
		SQL:  "INSERT INTO orders (product_id, quantity) VALUES ($1, $2)",
		Args: []any{1, 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Source != "primary" || res.Reason != "writes_always_primary" {
		t.Fatalf("got %+v", res)
	}
	if p.execs != 1 {
		t.Fatalf("execs=%d", p.execs)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.rows["orders"]) == 0 {
		t.Fatal("expected immediate mirror push after write")
	}
}

func TestFailoverWhenMirrorDown(t *testing.T) {
	p, m := newFakePrimary(), newFakeMirror(false)
	e := testEngine(p, m)
	res, err := e.Query(context.Background(), Request{SQL: "SELECT * FROM products"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Source != "primary" || res.Reason != "mirror_unavailable_fallback" {
		t.Fatalf("got source=%s reason=%s", res.Source, res.Reason)
	}
	if p.queries != 1 {
		t.Fatalf("expected primary fallback, queries=%d", p.queries)
	}
}

func TestFailoverWhenMirrorQueryFails(t *testing.T) {
	p, m := newFakePrimary(), newFakeMirror(true)
	m.failQ = true
	e := testEngine(p, m)
	res, err := e.Query(context.Background(), Request{SQL: "SELECT * FROM products"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Source != "primary" {
		t.Fatalf("source=%s", res.Source)
	}
	if p.queries != 1 {
		t.Fatalf("primary queries=%d", p.queries)
	}
}

func TestRejectWriteOnQueryEndpoint(t *testing.T) {
	e := testEngine(newFakePrimary(), newFakeMirror(true))
	_, err := e.Query(context.Background(), Request{SQL: "DELETE FROM products"})
	if err == nil {
		t.Fatal("expected error")
	}
}
