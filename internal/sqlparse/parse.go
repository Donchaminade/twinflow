// Package sqlparse inspects a single SQL statement enough to route it.
// It is intentionally conservative: unknown or multi-statement SQL is rejected.
package sqlparse

import (
	"fmt"
	"strings"
	"unicode"
)

type Kind int

const (
	KindUnknown Kind = iota
	KindRead
	KindWrite
)

func (k Kind) String() string {
	switch k {
	case KindRead:
		return "read"
	case KindWrite:
		return "write"
	default:
		return "unknown"
	}
}

type Statement struct {
	SQL    string
	Kind   Kind
	Tables []string
}

var writeLeaders = map[string]struct{}{
	"INSERT": {}, "UPDATE": {}, "DELETE": {}, "MERGE": {},
	"CREATE": {}, "ALTER": {}, "DROP": {}, "TRUNCATE": {},
	"REPLACE": {}, "GRANT": {}, "REVOKE": {}, "COMMENT": {},
}

var readLeaders = map[string]struct{}{
	"SELECT": {}, "WITH": {}, "SHOW": {}, "EXPLAIN": {},
}

// Parse validates and classifies a single SQL statement. Values must be bound
// via parameters; the parser never logs or returns argument data.
func Parse(sql string) (Statement, error) {
	trimmed := strings.TrimSpace(sql)
	if trimmed == "" {
		return Statement{}, fmt.Errorf("empty sql")
	}
	if strings.ContainsRune(trimmed, 0) {
		return Statement{}, fmt.Errorf("invalid sql")
	}
	stripped := stripComments(trimmed)
	if stripped == "" {
		return Statement{}, fmt.Errorf("empty sql")
	}
	if hasMultipleStatements(stripped) {
		return Statement{}, fmt.Errorf("multiple statements are not allowed")
	}
	stripped = strings.TrimRight(strings.TrimSpace(stripped), ";")
	upper := strings.ToUpper(stripped)
	leader := firstIdent(upper)
	st := Statement{SQL: stripped, Tables: extractTables(stripped)}
	if _, ok := writeLeaders[leader]; ok {
		st.Kind = KindWrite
		return st, nil
	}
	if _, ok := readLeaders[leader]; ok {
		st.Kind = KindRead
		return st, nil
	}
	return Statement{}, fmt.Errorf("unsupported statement %q", leader)
}

func firstIdent(upper string) string {
	i := 0
	for i < len(upper) && unicode.IsSpace(rune(upper[i])) {
		i++
	}
	j := i
	for j < len(upper) && (unicode.IsLetter(rune(upper[j])) || upper[j] == '_') {
		j++
	}
	return upper[i:j]
}

func stripComments(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	inSingle, inDouble := false, false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if inSingle {
			b.WriteByte(c)
			if c == '\'' && i+1 < len(s) && s[i+1] == '\'' {
				b.WriteByte(s[i+1])
				i++
				continue
			}
			if c == '\'' {
				inSingle = false
			}
			continue
		}
		if inDouble {
			b.WriteByte(c)
			if c == '"' {
				inDouble = false
			}
			continue
		}
		if c == '\'' {
			inSingle = true
			b.WriteByte(c)
			continue
		}
		if c == '"' {
			inDouble = true
			b.WriteByte(c)
			continue
		}
		if c == '-' && i+1 < len(s) && s[i+1] == '-' {
			for i < len(s) && s[i] != '\n' {
				i++
			}
			if i < len(s) {
				b.WriteByte('\n')
			}
			continue
		}
		if c == '/' && i+1 < len(s) && s[i+1] == '*' {
			i += 2
			for i+1 < len(s) && !(s[i] == '*' && s[i+1] == '/') {
				i++
			}
			i++
			b.WriteByte(' ')
			continue
		}
		b.WriteByte(c)
	}
	return b.String()
}

func hasMultipleStatements(s string) bool {
	inSingle, inDouble := false, false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if inSingle {
			if c == '\'' && i+1 < len(s) && s[i+1] == '\'' {
				i++
				continue
			}
			if c == '\'' {
				inSingle = false
			}
			continue
		}
		if inDouble {
			if c == '"' {
				inDouble = false
			}
			continue
		}
		if c == '\'' {
			inSingle = true
			continue
		}
		if c == '"' {
			inDouble = true
			continue
		}
		if c == ';' {
			rest := strings.TrimSpace(s[i+1:])
			return rest != ""
		}
	}
	return false
}

func extractTables(sql string) []string {
	tokens := tokenize(sql)
	seen := map[string]struct{}{}
	var tables []string
	add := func(name string) {
		name = normalizeIdent(name)
		if name == "" || isReserved(name) {
			return
		}
		if _, ok := seen[name]; ok {
			return
		}
		seen[name] = struct{}{}
		tables = append(tables, name)
	}
	for i := 0; i < len(tokens); i++ {
		t := strings.ToUpper(tokens[i])
		switch t {
		case "FROM", "JOIN", "INTO", "UPDATE", "TABLE":
			if i+1 < len(tokens) {
				next := tokens[i+1]
				if strings.EqualFold(next, "ONLY") && i+2 < len(tokens) {
					add(tokens[i+2])
					i++
					continue
				}
				add(next)
			}
		}
	}
	return tables
}

func tokenize(sql string) []string {
	var out []string
	var cur strings.Builder
	flush := func() {
		if cur.Len() > 0 {
			out = append(out, cur.String())
			cur.Reset()
		}
	}
	inSingle, inDouble := false, false
	for i := 0; i < len(sql); i++ {
		c := sql[i]
		if inSingle {
			cur.WriteByte(c)
			if c == '\'' && i+1 < len(sql) && sql[i+1] == '\'' {
				cur.WriteByte(sql[i+1])
				i++
				continue
			}
			if c == '\'' {
				inSingle = false
			}
			continue
		}
		if inDouble {
			cur.WriteByte(c)
			if c == '"' {
				inDouble = false
				flush()
			}
			continue
		}
		if c == '\'' {
			flush()
			inSingle = true
			cur.WriteByte(c)
			continue
		}
		if c == '"' {
			flush()
			inDouble = true
			cur.WriteByte(c)
			continue
		}
		if unicode.IsSpace(rune(c)) || c == ',' || c == '(' || c == ')' {
			flush()
			continue
		}
		cur.WriteByte(c)
	}
	flush()
	return out
}

func normalizeIdent(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, `"`)
	if i := strings.LastIndex(s, "."); i >= 0 {
		s = s[i+1:]
	}
	return strings.ToLower(s)
}

// ToSQLitePlaceholders rewrites $1, $2, … to ? so the same bound SQL can run
// on the embedded mirror. String literals are left untouched.
func ToSQLitePlaceholders(sql string) string {
	var b strings.Builder
	b.Grow(len(sql))
	inSingle, inDouble := false, false
	for i := 0; i < len(sql); i++ {
		c := sql[i]
		if inSingle {
			b.WriteByte(c)
			if c == '\'' && i+1 < len(sql) && sql[i+1] == '\'' {
				b.WriteByte(sql[i+1])
				i++
				continue
			}
			if c == '\'' {
				inSingle = false
			}
			continue
		}
		if inDouble {
			b.WriteByte(c)
			if c == '"' {
				inDouble = false
			}
			continue
		}
		if c == '\'' {
			inSingle = true
			b.WriteByte(c)
			continue
		}
		if c == '"' {
			inDouble = true
			b.WriteByte(c)
			continue
		}
		if c == '$' && i+1 < len(sql) && sql[i+1] >= '1' && sql[i+1] <= '9' {
			j := i + 1
			for j < len(sql) && sql[j] >= '0' && sql[j] <= '9' {
				j++
			}
			b.WriteByte('?')
			i = j - 1
			continue
		}
		b.WriteByte(c)
	}
	return b.String()
}

func isReserved(name string) bool {
	switch name {
	case "select", "from", "where", "and", "or", "join", "left", "right",
		"inner", "outer", "on", "as", "set", "values", "into", "update",
		"delete", "insert", "table", "only", "dual", "lateral", "unnest":
		return true
	}
	return false
}

// EnsureReturning appends RETURNING * to DML that can stream rows back for
// immediate mirror invalidation. It is a no-op when RETURNING is already present
// or the statement is not DML.
func EnsureReturning(sql string) string {
	upper := strings.ToUpper(strings.TrimSpace(sql))
	if strings.Contains(upper, "RETURNING") {
		return sql
	}
	leader := firstIdent(upper)
	switch leader {
	case "INSERT", "UPDATE", "DELETE":
		return strings.TrimRight(strings.TrimSpace(sql), ";") + " RETURNING *"
	default:
		return sql
	}
}
