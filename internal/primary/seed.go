package primary

import (
	"context"
	"fmt"
	"os"
	"strings"
)

// ApplySeedFile runs an idempotent SQL file against the primary (demo schema).
func (p *Postgres) ApplySeedFile(ctx context.Context, path string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read seed %s: %w", path, err)
	}
	stmts := splitSQL(string(raw))
	if len(stmts) == 0 {
		return fmt.Errorf("seed %s is empty", path)
	}
	for i, stmt := range stmts {
		if _, err := p.pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("seed %s statement %d: %w", path, i+1, err)
		}
	}
	return nil
}

// splitSQL drops -- line comments and splits on semicolons.
// Sufficient for examples/init.sql (no dollar-quoted bodies).
func splitSQL(src string) []string {
	var b strings.Builder
	for _, line := range strings.Split(src, "\n") {
		if i := strings.Index(line, "--"); i >= 0 {
			line = line[:i]
		}
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	parts := strings.Split(b.String(), ";")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		s := strings.TrimSpace(part)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}
