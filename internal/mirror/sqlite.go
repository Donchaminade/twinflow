package mirror

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"github.com/twinflow/twinflow/internal/store"
)

type SQLite struct {
	db        *sql.DB
	mu        sync.RWMutex
	ready     bool
	lag       time.Duration
	lastSync  time.Time
	lastErr   string
	started   time.Time
}

func Open(path string) (*SQLite, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil && filepath.Dir(path) != "." && filepath.Dir(path) != "" {
		return nil, fmt.Errorf("mirror dir: %w", err)
	}
	dsn := path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS _twinflow_wm (
		table_name TEXT PRIMARY KEY,
		wm_time TEXT NOT NULL,
		wm_pk TEXT NOT NULL
	)`); err != nil {
		db.Close()
		return nil, err
	}
	return &SQLite{db: db, started: time.Now()}, nil
}

func (m *SQLite) Ready() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.ready
}

func (m *SQLite) Lag() time.Duration {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.lastSync.IsZero() {
		if m.started.IsZero() {
			return time.Hour
		}
		return time.Since(m.started)
	}
	return time.Since(m.lastSync)
}

func (m *SQLite) LastError() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.lastErr
}

func (m *SQLite) LastSync() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.lastSync
}

func (m *SQLite) MarkSynced(at time.Time, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err != nil {
		m.lastErr = err.Error()
		m.ready = false
		return
	}
	m.lastErr = ""
	m.lastSync = at
	m.ready = true
	m.lag = time.Since(at)
}

func (m *SQLite) EnsureTable(schema store.TableSchema) error {
	if len(schema.Columns) == 0 {
		return fmt.Errorf("empty schema for %s", schema.Name)
	}
	var b strings.Builder
	fmt.Fprintf(&b, `CREATE TABLE IF NOT EXISTS %s (`, quote(schema.Name))
	for i, c := range schema.Columns {
		if i > 0 {
			b.WriteString(", ")
		}
		fmt.Fprintf(&b, `%s %s`, quote(c.Name), mapType(c.PGType))
		if schema.PK != "" && strings.EqualFold(c.Name, schema.PK) {
			b.WriteString(" PRIMARY KEY")
		}
	}
	b.WriteString(")")
	_, err := m.db.Exec(b.String())
	return err
}

func (m *SQLite) Query(ctx context.Context, q string, args []any) (store.Result, error) {
	rows, err := m.db.QueryContext(ctx, q, args...)
	if err != nil {
		return store.Result{}, err
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return store.Result{}, err
	}
	var out []store.Row
	for rows.Next() {
		raw := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range raw {
			ptrs[i] = &raw[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return store.Result{}, err
		}
		row := make(store.Row, len(cols))
		for i, c := range cols {
			row[c] = coerce(raw[i])
		}
		out = append(out, row)
	}
	return store.Result{Columns: cols, Rows: out, RowsAffected: int64(len(out))}, rows.Err()
}

func (m *SQLite) Upsert(schema store.TableSchema, row store.Row) error {
	if len(schema.Columns) == 0 {
		return fmt.Errorf("no columns")
	}
	cols := make([]string, 0, len(schema.Columns))
	placeholders := make([]string, 0, len(schema.Columns))
	vals := make([]any, 0, len(schema.Columns))
	for i, c := range schema.Columns {
		if _, ok := row[c.Name]; !ok {
			// try case-insensitive
			for k, v := range row {
				if strings.EqualFold(k, c.Name) {
					row[c.Name] = v
					break
				}
			}
		}
		cols = append(cols, quote(c.Name))
		placeholders = append(placeholders, fmt.Sprintf("?%d", i+1))
		vals = append(vals, stringify(row[c.Name]))
	}
	updates := make([]string, 0, len(cols))
	for _, c := range schema.Columns {
		if schema.PK != "" && strings.EqualFold(c.Name, schema.PK) {
			continue
		}
		updates = append(updates, fmt.Sprintf("%s=excluded.%s", quote(c.Name), quote(c.Name)))
	}
	var sqlStr string
	if schema.PK != "" && len(updates) > 0 {
		sqlStr = fmt.Sprintf(
			`INSERT INTO %s (%s) VALUES (%s) ON CONFLICT(%s) DO UPDATE SET %s`,
			quote(schema.Name), strings.Join(cols, ","), strings.Join(placeholders, ","),
			quote(schema.PK), strings.Join(updates, ","),
		)
	} else if schema.PK != "" {
		sqlStr = fmt.Sprintf(
			`INSERT INTO %s (%s) VALUES (%s) ON CONFLICT(%s) DO NOTHING`,
			quote(schema.Name), strings.Join(cols, ","), strings.Join(placeholders, ","),
			quote(schema.PK),
		)
	} else {
		sqlStr = fmt.Sprintf(
			`INSERT INTO %s (%s) VALUES (%s)`,
			quote(schema.Name), strings.Join(cols, ","), strings.Join(placeholders, ","),
		)
	}
	_, err := m.db.Exec(sqlStr, vals...)
	return err
}

func (m *SQLite) DeletePK(schema store.TableSchema, pk string) error {
	if schema.PK == "" {
		return fmt.Errorf("no pk")
	}
	_, err := m.db.Exec(
		fmt.Sprintf(`DELETE FROM %s WHERE CAST(%s AS TEXT)=?`, quote(schema.Name), quote(schema.PK)),
		pk,
	)
	return err
}

func (m *SQLite) SetWatermark(table string, wm store.Watermark) error {
	_, err := m.db.Exec(
		`INSERT INTO _twinflow_wm(table_name, wm_time, wm_pk) VALUES(?,?,?)
		 ON CONFLICT(table_name) DO UPDATE SET wm_time=excluded.wm_time, wm_pk=excluded.wm_pk`,
		table, wm.Time.UTC().Format(time.RFC3339Nano), wm.PK,
	)
	return err
}

func (m *SQLite) Watermark(table string) (store.Watermark, bool) {
	var ts, pk string
	err := m.db.QueryRow(`SELECT wm_time, wm_pk FROM _twinflow_wm WHERE table_name=?`, table).Scan(&ts, &pk)
	if err != nil {
		return store.Watermark{}, false
	}
	t, err := time.Parse(time.RFC3339Nano, ts)
	if err != nil {
		t, _ = time.Parse(time.RFC3339, ts)
	}
	return store.Watermark{Time: t, PK: pk}, true
}

func (m *SQLite) Count(table string) (int64, error) {
	var n int64
	err := m.db.QueryRow(`SELECT COUNT(*) FROM ` + quote(table)).Scan(&n)
	return n, err
}

func (m *SQLite) Close() error {
	return m.db.Close()
}

func mapType(pg string) string {
	switch strings.ToLower(pg) {
	case "integer", "bigint", "smallint", "serial", "bigserial":
		return "INTEGER"
	case "real", "double precision", "numeric", "decimal", "money":
		return "REAL"
	case "boolean":
		return "INTEGER"
	default:
		return "TEXT"
	}
}

func quote(name string) string {
	name = strings.ReplaceAll(name, `"`, ``)
	return `"` + name + `"`
}

func stringify(v any) any {
	if v == nil {
		return nil
	}
	switch t := v.(type) {
	case time.Time:
		return t.UTC().Format(time.RFC3339Nano)
	case []byte:
		return string(t)
	case json.Number:
		return t.String()
	case map[string]any, []any:
		b, _ := json.Marshal(t)
		return string(b)
	default:
		return v
	}
}

func coerce(v any) any {
	switch t := v.(type) {
	case []byte:
		return string(t)
	default:
		return v
	}
}
