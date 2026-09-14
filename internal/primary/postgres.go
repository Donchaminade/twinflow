package primary

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/store"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func Open(ctx context.Context, cfg *config.Config) (*Postgres, error) {
	pcfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("parse primary url: %w", err)
	}
	pcfg.MaxConns = cfg.Primary.MaxConns
	pcfg.MinConns = cfg.Primary.MinConns
	pcfg.MaxConnIdleTime = 2 * time.Minute
	pcfg.MaxConnLifetime = 30 * time.Minute
	pcfg.HealthCheckPeriod = 30 * time.Second
	pool, err := pgxpool.NewWithConfig(ctx, pcfg)
	if err != nil {
		return nil, fmt.Errorf("open primary pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping primary: %w", err)
	}
	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Ping(ctx context.Context) error {
	return p.pool.Ping(ctx)
}

func (p *Postgres) Query(ctx context.Context, sql string, args []any) (store.Result, error) {
	rows, err := p.pool.Query(ctx, sql, args...)
	if err != nil {
		return store.Result{}, err
	}
	defer rows.Close()
	return collect(rows)
}

func (p *Postgres) Exec(ctx context.Context, sql string, args []any) (store.Result, error) {
	rows, err := p.pool.Query(ctx, sql, args...)
	if err != nil {
		tag, execErr := p.pool.Exec(ctx, sql, args...)
		if execErr != nil {
			return store.Result{}, execErr
		}
		return store.Result{RowsAffected: tag.RowsAffected()}, nil
	}
	defer rows.Close()
	res, err := collect(rows)
	if err != nil {
		return store.Result{}, err
	}
	if res.RowsAffected == 0 {
		res.RowsAffected = int64(len(res.Rows))
	}
	return res, nil
}

func (p *Postgres) Schema(ctx context.Context, table string) (store.TableSchema, error) {
	const q = `
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = $1
ORDER BY ordinal_position`
	rows, err := p.pool.Query(ctx, q, table)
	if err != nil {
		return store.TableSchema{}, err
	}
	defer rows.Close()
	out := store.TableSchema{Name: table}
	for rows.Next() {
		var col store.Column
		var nullable string
		if err := rows.Scan(&col.Name, &col.PGType, &nullable); err != nil {
			return store.TableSchema{}, err
		}
		col.Nullable = strings.EqualFold(nullable, "YES")
		out.Columns = append(out.Columns, col)
	}
	if err := rows.Err(); err != nil {
		return store.TableSchema{}, err
	}
	if len(out.Columns) == 0 {
		return store.TableSchema{}, fmt.Errorf("table %s not found in public schema", table)
	}
	return out, nil
}

func (p *Postgres) FetchIncremental(ctx context.Context, table, watermarkCol, pk string, after store.Watermark, limit int) ([]store.Row, error) {
	table = quoteIdent(table)
	wm := quoteIdent(watermarkCol)
	pkq := quoteIdent(pk)
	sql := fmt.Sprintf(
		`SELECT * FROM %s WHERE (%s, CAST(%s AS TEXT)) > ($1, $2) ORDER BY %s ASC, %s ASC LIMIT $3`,
		table, wm, pkq, wm, pkq,
	)
	rows, err := p.pool.Query(ctx, sql, after.Time, after.PK, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res, err := collect(rows)
	if err != nil {
		return nil, err
	}
	return res.Rows, nil
}

func (p *Postgres) ListPKs(ctx context.Context, table, pk string) ([]string, error) {
	sql := fmt.Sprintf(`SELECT CAST(%s AS TEXT) FROM %s`, quoteIdent(pk), quoteIdent(table))
	rows, err := p.pool.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (p *Postgres) PoolStats() store.PoolStats {
	s := p.pool.Stat()
	return store.PoolStats{
		Acquired:    s.AcquiredConns(),
		Idle:        s.IdleConns(),
		MaxConns:    s.MaxConns(),
		Constructed: s.TotalConns(),
	}
}

func (p *Postgres) Close() {
	p.pool.Close()
}

func collect(rows pgx.Rows) (store.Result, error) {
	fds := rows.FieldDescriptions()
	cols := make([]string, len(fds))
	for i, fd := range fds {
		cols[i] = string(fd.Name)
	}
	var out []store.Row
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return store.Result{}, err
		}
		row := make(store.Row, len(cols))
		for i, c := range cols {
			row[c] = normalizeValue(vals[i])
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return store.Result{}, err
	}
	return store.Result{Columns: cols, Rows: out, RowsAffected: int64(len(out))}, nil
}

func normalizeValue(v any) any {
	switch t := v.(type) {
	case time.Time:
		return t.UTC().Format(time.RFC3339Nano)
	case []byte:
		return string(t)
	default:
		return v
	}
}

func quoteIdent(name string) string {
	name = strings.ReplaceAll(name, `"`, ``)
	return `"` + name + `"`
}
