// Package router decides whether a statement hits the local mirror or the
// central primary. The central database is always the source of truth for writes.
package router

import (
	"strings"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/sqlparse"
)

type Destination string

const (
	DestMirror  Destination = "mirror"
	DestPrimary Destination = "primary"
)

type Reason string

const (
	ReasonWrite          Reason = "writes_always_primary"
	ReasonFreshTable     Reason = "fresh_table"
	ReasonFreshOverride  Reason = "fresh_override"
	ReasonMirrorDefault  Reason = "default_read_mirror"
	ReasonMirrorLag      Reason = "mirror_lag_fallback"
	ReasonMirrorDown     Reason = "mirror_unavailable_fallback"
	ReasonUnknownTable   Reason = "unknown_table_primary"
	ReasonNotSynced      Reason = "table_not_synced"
)

type Decision struct {
	Destination Destination
	Reason      Reason
	Tables      []string
}

type MirrorHealth struct {
	Ready     bool
	Lag       time.Duration
	LastError string
}

type Router struct {
	cfg    *config.Config
	health func() MirrorHealth
}

func New(cfg *config.Config, health func() MirrorHealth) *Router {
	return &Router{cfg: cfg, health: health}
}

// Route applies the v1 R/W contract:
//   - writes → primary
//   - reads of a fresh table or fresh:true → primary
//   - other reads → mirror, falling back to primary if the mirror is down or lagging
func (r *Router) Route(st sqlparse.Statement, freshOverride bool) Decision {
	if st.Kind == sqlparse.KindWrite {
		return Decision{Destination: DestPrimary, Reason: ReasonWrite, Tables: st.Tables}
	}
	if freshOverride {
		return Decision{Destination: DestPrimary, Reason: ReasonFreshOverride, Tables: st.Tables}
	}

	anyFresh := false
	anyUnknown := false
	anyUnsynced := false
	for _, name := range st.Tables {
		tbl, ok := r.cfg.Table(name)
		if !ok {
			anyUnknown = true
			continue
		}
		if tbl.Fresh {
			anyFresh = true
		}
		if !tbl.Sync {
			anyUnsynced = true
		}
	}
	if anyFresh {
		return Decision{Destination: DestPrimary, Reason: ReasonFreshTable, Tables: st.Tables}
	}
	if anyUnknown {
		return Decision{Destination: DestPrimary, Reason: ReasonUnknownTable, Tables: st.Tables}
	}
	if anyUnsynced {
		return Decision{Destination: DestPrimary, Reason: ReasonNotSynced, Tables: st.Tables}
	}

	h := r.health()
	if !h.Ready {
		return Decision{Destination: DestPrimary, Reason: ReasonMirrorDown, Tables: st.Tables}
	}
	if r.cfg.Mirror.MaxLag > 0 && h.Lag > r.cfg.Mirror.MaxLag {
		return Decision{Destination: DestPrimary, Reason: ReasonMirrorLag, Tables: st.Tables}
	}
	return Decision{Destination: DestMirror, Reason: ReasonMirrorDefault, Tables: st.Tables}
}

func NormalizeTables(names []string) []string {
	out := make([]string, 0, len(names))
	seen := map[string]struct{}{}
	for _, n := range names {
		n = strings.ToLower(strings.TrimSpace(n))
		if n == "" {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		out = append(out, n)
	}
	return out
}
