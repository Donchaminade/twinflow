package router

import (
	"testing"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/sqlparse"
)

func testCfg() *config.Config {
	return &config.Config{
		Mirror: config.MirrorConfig{MaxLag: 3 * time.Second},
		Tables: []config.TableConfig{
			{Name: "products", Fresh: false, Sync: true, PK: "id", Watermark: "updated_at"},
			{Name: "stock", Fresh: true, Sync: true, PK: "product_id", Watermark: "updated_at"},
			{Name: "audit", Fresh: false, Sync: false, PK: "id", Watermark: "updated_at"},
		},
	}
}

func TestWritesAlwaysPrimary(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true, Lag: time.Millisecond} })
	st, _ := sqlparse.Parse("INSERT INTO products (name) VALUES ($1)")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonWrite {
		t.Fatalf("got %+v", d)
	}
}

func TestDefaultReadUsesMirror(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true, Lag: 200 * time.Millisecond} })
	st, _ := sqlparse.Parse("SELECT * FROM products")
	d := r.Route(st, false)
	if d.Destination != DestMirror || d.Reason != ReasonMirrorDefault {
		t.Fatalf("got %+v", d)
	}
}

func TestFreshTableUsesPrimary(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true} })
	st, _ := sqlparse.Parse("SELECT quantity FROM stock WHERE product_id = $1")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonFreshTable {
		t.Fatalf("got %+v", d)
	}
}

func TestFreshOverrideUsesPrimary(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true} })
	st, _ := sqlparse.Parse("SELECT * FROM products")
	d := r.Route(st, true)
	if d.Destination != DestPrimary || d.Reason != ReasonFreshOverride {
		t.Fatalf("got %+v", d)
	}
}

func TestMirrorLagFallback(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true, Lag: 5 * time.Second} })
	st, _ := sqlparse.Parse("SELECT * FROM products")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonMirrorLag {
		t.Fatalf("got %+v", d)
	}
}

func TestMirrorDownFallback(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: false} })
	st, _ := sqlparse.Parse("SELECT * FROM products")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonMirrorDown {
		t.Fatalf("got %+v", d)
	}
}

func TestUnknownTablePrimary(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true} })
	st, _ := sqlparse.Parse("SELECT * FROM secrets")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonUnknownTable {
		t.Fatalf("got %+v", d)
	}
}

func TestUnsyncedTablePrimary(t *testing.T) {
	r := New(testCfg(), func() MirrorHealth { return MirrorHealth{Ready: true} })
	st, _ := sqlparse.Parse("SELECT * FROM audit")
	d := r.Route(st, false)
	if d.Destination != DestPrimary || d.Reason != ReasonNotSynced {
		t.Fatalf("got %+v", d)
	}
}
