// Package regulator protects the central database: connection-aware rate
// limiting and a bounded write queue so a spike cannot open unbounded sessions.
package regulator

import (
	"context"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/time/rate"

	"github.com/twinflow/twinflow/internal/config"
)

var (
	ErrQueueFull = errors.New("write queue is full")
	ErrTimeout   = errors.New("regulator timeout")
)

type Stats struct {
	QueueDepth   int   `json:"queue_depth"`
	QueueLimit   int   `json:"queue_limit"`
	QueueDropped int64 `json:"queue_dropped"`
	WritesIn     int64 `json:"writes_admitted"`
	WritesDone   int64 `json:"writes_completed"`
	ReadsLimited int64 `json:"primary_reads_limited"`
	RPS          float64 `json:"rate_limit_rps"`
}

type Regulator struct {
	lim      *rate.Limiter
	writeSem chan struct{}
	writeTO  time.Duration
	readTO   time.Duration
	dropped  atomic.Int64
	writesIn atomic.Int64
	writesOK atomic.Int64
	readsLim atomic.Int64
	limit    int
	rps      float64
	mu       sync.Mutex
}

func New(cfg config.RegulatorConfig) *Regulator {
	burst := cfg.Burst
	if burst < 1 {
		burst = 1
	}
	return &Regulator{
		lim:      rate.NewLimiter(rate.Limit(cfg.RateLimitRPS), burst),
		writeSem: make(chan struct{}, cfg.WriteQueueSize),
		writeTO:  cfg.WriteTimeout,
		readTO:   cfg.ReadTimeout,
		limit:    cfg.WriteQueueSize,
		rps:      cfg.RateLimitRPS,
	}
}

// DoWrite enqueues a write. If the queue is full the call fails fast so the
// sidecar sheds load instead of buffering an unbounded spike toward the DB.
func (r *Regulator) DoWrite(ctx context.Context, fn func(context.Context) error) error {
	select {
	case r.writeSem <- struct{}{}:
	default:
		r.dropped.Add(1)
		return ErrQueueFull
	}
	defer func() { <-r.writeSem }()

	r.writesIn.Add(1)
	ctx, cancel := context.WithTimeout(ctx, r.writeTO)
	defer cancel()
	if err := r.lim.Wait(ctx); err != nil {
		if isTimeout(ctx, err) {
			return ErrTimeout
		}
		return err
	}
	err := fn(ctx)
	if err == nil {
		r.writesOK.Add(1)
	}
	return err
}

// DoPrimaryRead rate-limits traffic that must hit the central database.
// Mirror reads never enter this path.
func (r *Regulator) DoPrimaryRead(ctx context.Context, fn func(context.Context) error) error {
	ctx, cancel := context.WithTimeout(ctx, r.readTO)
	defer cancel()
	if err := r.lim.Wait(ctx); err != nil {
		r.readsLim.Add(1)
		if isTimeout(ctx, err) {
			return ErrTimeout
		}
		return err
	}
	return fn(ctx)
}

func isTimeout(ctx context.Context, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return true
	}
	if ctx.Err() != nil {
		return true
	}
	msg := err.Error()
	return contains(msg, "exceed context deadline") || contains(msg, "context deadline exceeded")
}

func contains(s, sub string) bool {
	return strings.Contains(s, sub)
}

func (r *Regulator) Stats() Stats {
	return Stats{
		QueueDepth:   len(r.writeSem),
		QueueLimit:   r.limit,
		QueueDropped: r.dropped.Load(),
		WritesIn:     r.writesIn.Load(),
		WritesDone:   r.writesOK.Load(),
		ReadsLimited: r.readsLim.Load(),
		RPS:          r.rps,
	}
}
