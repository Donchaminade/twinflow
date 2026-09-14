package sqlparse

import "testing"

func TestParseReadsAndWrites(t *testing.T) {
	cases := []struct {
		sql    string
		kind   Kind
		tables []string
	}{
		{"SELECT * FROM products WHERE id = $1", KindRead, []string{"products"}},
		{"SELECT p.name FROM products p JOIN stock s ON s.product_id = p.id", KindRead, []string{"products", "stock"}},
		{"INSERT INTO orders (product_id, quantity) VALUES ($1, $2)", KindWrite, []string{"orders"}},
		{"UPDATE stock SET quantity = quantity - 1 WHERE product_id = $1", KindWrite, []string{"stock"}},
		{"DELETE FROM orders WHERE id = $1", KindWrite, []string{"orders"}},
	}
	for _, tc := range cases {
		st, err := Parse(tc.sql)
		if err != nil {
			t.Fatalf("parse %q: %v", tc.sql, err)
		}
		if st.Kind != tc.kind {
			t.Fatalf("%q: kind %s want %s", tc.sql, st.Kind, tc.kind)
		}
		if len(st.Tables) != len(tc.tables) {
			t.Fatalf("%q: tables %v want %v", tc.sql, st.Tables, tc.tables)
		}
		for i, name := range tc.tables {
			if st.Tables[i] != name {
				t.Fatalf("%q: table[%d]=%s want %s", tc.sql, i, st.Tables[i], name)
			}
		}
	}
}

func TestRejectMultipleStatements(t *testing.T) {
	_, err := Parse("SELECT 1; DROP TABLE products")
	if err == nil {
		t.Fatal("expected rejection")
	}
}

func TestCommentsDoNotHideSecondStatement(t *testing.T) {
	st, err := Parse("SELECT * FROM products -- trailing")
	if err != nil {
		t.Fatal(err)
	}
	if st.Kind != KindRead {
		t.Fatalf("kind %s", st.Kind)
	}
}

func TestToSQLitePlaceholders(t *testing.T) {
	got := ToSQLitePlaceholders(`SELECT * FROM products WHERE name = '$1' AND id = $1`)
	want := `SELECT * FROM products WHERE name = '$1' AND id = ?`
	if got != want {
		t.Fatalf("got %q", got)
	}
}

func TestEnsureReturning(t *testing.T) {
	got := EnsureReturning("UPDATE stock SET quantity = 1 WHERE product_id = $1")
	if got != "UPDATE stock SET quantity = 1 WHERE product_id = $1 RETURNING *" {
		t.Fatalf("got %q", got)
	}
	already := "DELETE FROM orders WHERE id = $1 RETURNING id"
	if EnsureReturning(already) != already {
		t.Fatal("should keep existing RETURNING")
	}
}
