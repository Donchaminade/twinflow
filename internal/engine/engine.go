package engine

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/mirror"
	"github.com/twinflow/twinflow/internal/regulator"
	"github.com/twinflow/twinflow/internal/router"
	"github.com/twinflow/twinflow/internal/sqlparse"
	"github.com/twinflow/twinflow/internal/store"
)

type Request struct {
	SQL   string
	Args  []any
	Fresh bool
}

type Response struct {
	Columns      []string         `json:"columns"`
	Rows         []store.Row      `json:"rows"`
	RowsAffected int64            `json:"rows_affected"`
	Source       string           `json:"source"`
	Reason       string           `json:"reason"`
	Kind         string           `json:"kind"`
	Tables       []string         `json:"tables"`
	MirrorLagMS  int64            `json:"mirror_lag_ms"`
	DurationMS   int64            `json:"duration_ms"`
	Invalidated  []string         `json:"invalidated,omitempty"`
}

type Engine struct {
	cfg       *config.Config
	primary   store.Primary
	mirror    store.Mirror
	syncer    *mirror.Syncer
	reg       *regulator.Regulator
	router    *router.Router
	log       *slog.Logger
	started   time.Time
}

func New(cfg *config.Config, primary store.Primary, mir store.Mirror, syncer *mirror.Syncer, log *slog.Logger) *Engine {
	e := &Engine{
		cfg:     cfg,
		primary: primary,
		mirror:  mir,
		syncer:  syncer,
		reg:     regulator.New(cfg.Regulator),
		log:     log,
		started: time.Now(),
	}
	e.router = router.New(cfg, e.mirrorHealth)
	return e
}

func (e *Engine) mirrorHealth() router.MirrorHealth {
	return router.MirrorHealth{
		Ready:     e.mirror.Ready(),
		Lag:       e.mirror.Lag(),
		LastError: e.mirror.LastError(),
	}
}

func (e *Engine) Query(ctx context.Context, req Request) (Response, error) {
	start := time.Now()
	st, err := sqlparse.Parse(req.SQL)
	if err != nil {
		return Response{}, fmt.Errorf("sql: %w", err)
	}
	if st.Kind != sqlparse.KindRead {
		return Response{}, fmt.Errorf("use /v1/exec for writes")
	}
	dec := e.router.Route(st, req.Fresh)
	var res store.Result
	switch dec.Destination {
	case router.DestMirror:
		res, err = e.mirror.Query(ctx, sqlparse.ToSQLitePlaceholders(st.SQL), req.Args)
		if err != nil {
			e.log.Warn("mirror query failed; falling back to primary", "tables", st.Tables, "err", err)
			dec.Destination = router.DestPrimary
			dec.Reason = router.ReasonMirrorDown
			err = e.reg.DoPrimaryRead(ctx, func(ctx context.Context) error {
				var qerr error
				res, qerr = e.primary.Query(ctx, st.SQL, req.Args)
				return qerr
			})
		}
	default:
		err = e.reg.DoPrimaryRead(ctx, func(ctx context.Context) error {
			var qerr error
			res, qerr = e.primary.Query(ctx, st.SQL, req.Args)
			return qerr
		})
	}
	if err != nil {
		return Response{}, err
	}
	e.log.Info("query",
		"kind", st.Kind.String(),
		"tables", st.Tables,
		"source", dec.Destination,
		"reason", dec.Reason,
		"duration_ms", time.Since(start).Milliseconds(),
	)
	return Response{
		Columns:      res.Columns,
		Rows:         res.Rows,
		RowsAffected: res.RowsAffected,
		Source:       string(dec.Destination),
		Reason:       string(dec.Reason),
		Kind:         st.Kind.String(),
		Tables:       st.Tables,
		MirrorLagMS:  e.mirror.Lag().Milliseconds(),
		DurationMS:   time.Since(start).Milliseconds(),
	}, nil
}

func (e *Engine) Exec(ctx context.Context, req Request) (Response, error) {
	start := time.Now()
	st, err := sqlparse.Parse(req.SQL)
	if err != nil {
		return Response{}, fmt.Errorf("sql: %w", err)
	}
	if st.Kind != sqlparse.KindWrite {
		return Response{}, fmt.Errorf("use /v1/query for reads")
	}
	sql := sqlparse.EnsureReturning(st.SQL)
	deleted := strings.HasPrefix(strings.ToUpper(strings.TrimSpace(sql)), "DELETE")
	var res store.Result
	err = e.reg.DoWrite(ctx, func(ctx context.Context) error {
		var werr error
		res, werr = e.primary.Exec(ctx, sql, req.Args)
		return werr
	})
	if err != nil {
		return Response{}, err
	}
	if e.syncer != nil {
		e.syncer.Invalidate(ctx, st.Tables, res.Rows, deleted)
	}
	e.log.Info("exec",
		"kind", st.Kind.String(),
		"tables", st.Tables,
		"source", "primary",
		"reason", router.ReasonWrite,
		"duration_ms", time.Since(start).Milliseconds(),
		"rows_affected", res.RowsAffected,
	)
	return Response{
		Columns:      res.Columns,
		Rows:         res.Rows,
		RowsAffected: res.RowsAffected,
		Source:       string(router.DestPrimary),
		Reason:       string(router.ReasonWrite),
		Kind:         st.Kind.String(),
		Tables:       st.Tables,
		MirrorLagMS:  e.mirror.Lag().Milliseconds(),
		DurationMS:   time.Since(start).Milliseconds(),
		Invalidated:  st.Tables,
	}, nil
}

func (e *Engine) Ready(ctx context.Context) error {
	return e.primary.Ping(ctx)
}

func (e *Engine) Status() Status {
	tables := make([]TableStatus, 0, len(e.cfg.Tables))
	for _, t := range e.cfg.Tables {
		ts := TableStatus{
			Name:  t.Name,
			Fresh: t.Fresh,
			Sync:  t.Sync,
			Reads: "mirror",
		}
		if t.Fresh || !t.Sync {
			ts.Reads = "primary"
		}
		if wm, ok := e.mirror.Watermark(t.Name); ok {
			ts.Watermark = wm.Time.UTC().Format(time.RFC3339Nano)
		}
		if n, err := e.mirror.Count(t.Name); err == nil {
			ts.MirrorRows = n
		}
		tables = append(tables, ts)
	}
	return Status{
		Service:     "twinflow",
		Version:     Version,
		UptimeS:     int64(time.Since(e.started).Seconds()),
		PrimaryOK:   e.primary.Ping(context.Background()) == nil,
		MirrorReady: e.mirror.Ready(),
		MirrorLagMS: e.mirror.Lag().Milliseconds(),
		MirrorError: e.mirror.LastError(),
		LastSync:    e.mirror.LastSync().UTC().Format(time.RFC3339Nano),
		Pool:        e.primary.PoolStats(),
		Regulator:   e.reg.Stats(),
		Tables:      tables,
		Rules: []string{
			"central database is the source of truth",
			"writes always go to primary, then invalidate the local mirror",
			"reads default to the mirror unless the table is marked fresh",
			"if the mirror is down or lagging, reads fall back to primary",
			"under a spike, writes are queued and rate-limited; non-critical reads stay on the mirror",
		},
	}
}

const Version = "0.1.0"

type TableStatus struct {
	Name       string `json:"name"`
	Fresh      bool   `json:"fresh"`
	Sync       bool   `json:"sync"`
	Reads      string `json:"reads"`
	Watermark  string `json:"watermark,omitempty"`
	MirrorRows int64  `json:"mirror_rows"`
}

type Status struct {
	Service     string             `json:"service"`
	Version     string             `json:"version"`
	UptimeS     int64              `json:"uptime_s"`
	PrimaryOK   bool               `json:"primary_ok"`
	MirrorReady bool               `json:"mirror_ready"`
	MirrorLagMS int64              `json:"mirror_lag_ms"`
	MirrorError string             `json:"mirror_error,omitempty"`
	LastSync    string             `json:"last_sync"`
	Pool        store.PoolStats    `json:"pool"`
	Regulator   regulator.Stats    `json:"regulator"`
	Tables      []TableStatus      `json:"tables"`
	Rules       []string           `json:"rules"`
}
