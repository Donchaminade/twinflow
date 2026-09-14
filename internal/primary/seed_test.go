package primary

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestSplitSQLStripsCommentsAndSplits(t *testing.T) {
	src := `
-- heading
CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY);
-- another
INSERT INTO products (name) VALUES ('x');
`
	got := splitSQL(src)
	if len(got) != 2 {
		t.Fatalf("len=%d got=%v", len(got), got)
	}
	if got[0] != "CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY)" {
		t.Fatalf("stmt0=%q", got[0])
	}
	if got[1] != "INSERT INTO products (name) VALUES ('x')" {
		t.Fatalf("stmt1=%q", got[1])
	}
}

func TestSplitSQLDemoInitHasStatements(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	path := filepath.Join(filepath.Dir(file), "..", "..", "examples", "init.sql")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	stmts := splitSQL(string(raw))
	if len(stmts) < 6 {
		t.Fatalf("expected several statements, got %d", len(stmts))
	}
}
