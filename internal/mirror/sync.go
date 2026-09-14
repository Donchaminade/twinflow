package mirror

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/store"
)

// Syncer copies configured tables from primary → local mirror.
// Incremental by (watermark, pk); optional PK reconcile for missed deletes.
type Syncer struct {
	cfg     *config.Config
	primary store.Primary
	mirror  store.Mirror
	schemas map[string]store.TableSchema
	log     *slog.Logger
}

func NewSyncer(cfg *config.Config, primary store.Primary, mirror store.Mirror, log *slog.Logger) *Syncer {
	if log == nil {
		log = slog.Default()
	}
	return &Syncer{
		cfg:     cfg,
		primary: primary,
		mirror:  mirror,
		schemas: map[string]store.TableSchema{},
		log:     log,
	}
}

func (s *Syncer) Schema(table string) (store.TableSchema, bool) {
	sc, ok := s.schemas[table]
	return sc, ok
}

func (s *Syncer) Bootstrap(ctx context.Context) error {
	var firstErr error
	for _, tbl := range s.cfg.Tables {
		if !tbl.Sync {
			continue
		}
		if err := s.syncTable(ctx, tbl, true); err != nil {
			s.log.Warn("mirror bootstrap table failed", "table", tbl.Name, "err", err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	if firstErr != nil {
		s.mirror.MarkSynced(time.Now(), firstErr)
		return firstErr
	}
	s.mirror.MarkSynced(time.Now(), nil)
	s.log.Info("mirror bootstrap complete")
	return nil
}

func (s *Syncer) Run(ctx context.Context) {
	inc := time.NewTicker(s.cfg.Mirror.SyncInterval)
	rec := time.NewTicker(s.cfg.Mirror.ReconcileEvery)
	defer inc.Stop()
	defer rec.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-inc.C:
			s.tick(ctx, false)
		case <-rec.C:
			s.tick(ctx, true)
		}
	}
}

func (s *Syncer) tick(ctx context.Context, reconcile bool) {
	var firstErr error
	for _, tbl := range s.cfg.Tables {
		if !tbl.Sync {
			continue
		}
		if err := s.syncTable(ctx, tbl, reconcile); err != nil {
			s.log.Warn("mirror sync table failed", "table", tbl.Name, "err", err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	s.mirror.MarkSynced(time.Now(), firstErr)
}

// Invalidate pulls the latest rows for tables touched by a write (immediate push).
func (s *Syncer) Invalidate(ctx context.Context, tables []string, returning []store.Row, deleted bool) {
	for _, name := range tables {
		tbl, ok := s.cfg.Table(name)
		if !ok || !tbl.Sync {
			continue
		}
		schema, ok := s.schemas[name]
		if !ok {
			if err := s.syncTable(ctx, tbl, false); err != nil {
				s.log.Warn("post-write resync failed", "table", name, "err", err)
			}
			continue
		}
		if len(returning) > 0 {
			for _, row := range returning {
				if deleted {
					pk := stringifyPK(row, schema.PK)
					if err := s.mirror.DeletePK(schema, pk); err != nil {
						s.log.Warn("mirror delete failed", "table", name, "err", err)
					}
					continue
				}
				if err := s.mirror.Upsert(schema, row); err != nil {
					s.log.Warn("mirror upsert failed", "table", name, "err", err)
				}
			}
			continue
		}
		if err := s.syncTable(ctx, tbl, false); err != nil {
			s.log.Warn("post-write incremental failed", "table", name, "err", err)
		}
	}
}

func (s *Syncer) syncTable(ctx context.Context, tbl config.TableConfig, reconcile bool) error {
	schema, err := s.primary.Schema(ctx, tbl.Name)
	if err != nil {
		return err
	}
	schema.PK = tbl.PK
	if err := s.mirror.EnsureTable(schema); err != nil {
		return err
	}
	s.schemas[tbl.Name] = schema

	wm, ok := s.mirror.Watermark(tbl.Name)
	if !ok {
		wm = store.Watermark{Time: time.Time{}, PK: ""}
	}
	pulled := 0
	for {
		rows, err := s.primary.FetchIncremental(ctx, tbl.Name, tbl.Watermark, tbl.PK, wm, s.cfg.Mirror.BatchSize)
		if err != nil {
			return fmt.Errorf("incremental %s: %w", tbl.Name, err)
		}
		if len(rows) == 0 {
			break
		}
		for _, row := range rows {
			if err := s.mirror.Upsert(schema, row); err != nil {
				return err
			}
			wm = watermarkFrom(row, tbl.Watermark, tbl.PK, wm)
		}
		pulled += len(rows)
		if err := s.mirror.SetWatermark(tbl.Name, wm); err != nil {
			return err
		}
		if len(rows) < s.cfg.Mirror.BatchSize {
			break
		}
	}

	if reconcile {
		if err := s.reconcileDeletes(ctx, tbl, schema); err != nil {
			return err
		}
	}
	s.log.Debug("mirror table synced", "table", tbl.Name, "rows", pulled, "reconcile", reconcile)
	return nil
}

func (s *Syncer) reconcileDeletes(ctx context.Context, tbl config.TableConfig, schema store.TableSchema) error {
	pks, err := s.primary.ListPKs(ctx, tbl.Name, tbl.PK)
	if err != nil {
		return err
	}
	keep := map[string]struct{}{}
	for _, pk := range pks {
		keep[pk] = struct{}{}
	}
	res, err := s.mirror.Query(ctx, fmt.Sprintf(`SELECT CAST("%s" AS TEXT) AS pk FROM "%s"`, schema.PK, schema.Name), nil)
	if err != nil {
		return err
	}
	for _, row := range res.Rows {
		pk := fmt.Sprint(row["pk"])
		if _, ok := keep[pk]; !ok {
			if err := s.mirror.DeletePK(schema, pk); err != nil {
				return err
			}
		}
	}
	return nil
}

func watermarkFrom(row store.Row, wmCol, pk string, prev store.Watermark) store.Watermark {
	out := prev
	if v, ok := lookup(row, wmCol); ok {
		switch t := v.(type) {
		case time.Time:
			out.Time = t
		case string:
			if parsed, err := time.Parse(time.RFC3339Nano, t); err == nil {
				out.Time = parsed
			} else if parsed, err := time.Parse(time.RFC3339, t); err == nil {
				out.Time = parsed
			}
		}
	}
	if v, ok := lookup(row, pk); ok && v != nil {
		out.PK = fmt.Sprint(v)
	}
	return out
}

func lookup(row store.Row, key string) (any, bool) {
	if v, ok := row[key]; ok {
		return v, true
	}
	for k, v := range row {
		if strings.EqualFold(k, key) {
			return v, true
		}
	}
	return nil, false
}

func stringifyPK(row store.Row, pk string) string {
	if v, ok := lookup(row, pk); ok && v != nil {
		return fmt.Sprint(v)
	}
	return ""
}
