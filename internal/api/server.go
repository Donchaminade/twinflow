package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/twinflow/twinflow/internal/config"
	"github.com/twinflow/twinflow/internal/engine"
	"github.com/twinflow/twinflow/internal/regulator"
)

type Server struct {
	cfg *config.Config
	eng *engine.Engine
	log *slog.Logger
	http *http.Server
}

func New(cfg *config.Config, eng *engine.Engine, log *slog.Logger) *Server {
	s := &Server{cfg: cfg, eng: eng, log: log}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /ready", s.handleReady)
	mux.HandleFunc("GET /metrics", s.handleMetrics)
	mux.HandleFunc("GET /v1/status", s.auth(s.handleStatus))
	mux.HandleFunc("POST /v1/query", s.auth(s.handleQuery))
	mux.HandleFunc("POST /v1/exec", s.auth(s.handleExec))
	mux.HandleFunc("GET /", s.handleRoot)

	s.http = &http.Server{
		Addr:              cfg.Listen,
		Handler:           chain(mux, s.secureHeaders, s.cors, s.requestID),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 16,
	}
	return s
}

func (s *Server) Serve(ctx context.Context) error {
	ln, err := listen(s.cfg.Listen)
	if err != nil {
		return err
	}
	s.log.Info("listening", "addr", ln.Addr().String())
	errCh := make(chan error, 1)
	go func() {
		errCh <- s.http.Serve(ln)
	}()
	select {
	case <-ctx.Done():
		shctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		_ = s.http.Shutdown(shctx)
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func listen(addr string) (net.Listener, error) {
	if addr == "" {
		addr = ":8741"
	}
	return net.Listen("tcp", addr)
}

type sqlBody struct {
	SQL   string `json:"sql"`
	Args  []any  `json:"args"`
	Fresh bool   `json:"fresh"`
}

func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	var body sqlBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := s.eng.Query(r.Context(), engine.Request{SQL: body.SQL, Args: body.Args, Fresh: body.Fresh})
	if err != nil {
		writeEngineError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleExec(w http.ResponseWriter, r *http.Request) {
	var body sqlBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := s.eng.Exec(r.Context(), engine.Request{SQL: body.SQL, Args: body.Args})
	if err != nil {
		writeEngineError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.eng.Status())
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "twinflow", "version": engine.Version})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	if err := s.eng.Ready(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"status": "not_ready"})
		return
	}
	st := s.eng.Status()
	code := http.StatusOK
	state := "ready"
	if !st.MirrorReady {
		state = "degraded"
	}
	writeJSON(w, code, map[string]any{"status": state, "mirror_ready": st.MirrorReady, "primary_ok": st.PrimaryOK})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	st := s.eng.Status()
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	fmt.Fprintf(w, "# HELP twinflow_up TwinFlow process is up.\n# TYPE twinflow_up gauge\ntwinflow_up 1\n")
	fmt.Fprintf(w, "# HELP twinflow_mirror_ready Local mirror is serving reads.\n# TYPE twinflow_mirror_ready gauge\ntwinflow_mirror_ready %d\n", bool01(st.MirrorReady))
	fmt.Fprintf(w, "# HELP twinflow_primary_up Central database ping.\n# TYPE twinflow_primary_up gauge\ntwinflow_primary_up %d\n", bool01(st.PrimaryOK))
	fmt.Fprintf(w, "# HELP twinflow_mirror_lag_ms Estimated mirror lag.\n# TYPE twinflow_mirror_lag_ms gauge\ntwinflow_mirror_lag_ms %d\n", st.MirrorLagMS)
	fmt.Fprintf(w, "# HELP twinflow_write_queue_depth In-flight / queued writes.\n# TYPE twinflow_write_queue_depth gauge\ntwinflow_write_queue_depth %d\n", st.Regulator.QueueDepth)
	fmt.Fprintf(w, "# HELP twinflow_write_queue_dropped Writes rejected because the queue was full.\n# TYPE twinflow_write_queue_dropped_total counter\ntwinflow_write_queue_dropped_total %d\n", st.Regulator.QueueDropped)
	fmt.Fprintf(w, "# HELP twinflow_writes_completed_total Successful writes to primary.\n# TYPE twinflow_writes_completed_total counter\ntwinflow_writes_completed_total %d\n", st.Regulator.WritesDone)
	fmt.Fprintf(w, "# HELP twinflow_pool_acquired Open primary connections.\n# TYPE twinflow_pool_acquired gauge\ntwinflow_pool_acquired %d\n", st.Pool.Acquired)
	fmt.Fprintf(w, "# HELP twinflow_pool_max Configured primary pool size.\n# TYPE twinflow_pool_max gauge\ntwinflow_pool_max %d\n", st.Pool.MaxConns)
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "twinflow",
		"version": engine.Version,
		"docs":    "Connect your app to this sidecar. Reads default to the local mirror; writes always hit the central database.",
		"endpoints": []string{"GET /health", "GET /ready", "GET /metrics", "GET /v1/status", "POST /v1/query", "POST /v1/exec"},
	})
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.APIToken == "" {
			next(w, r)
			return
		}
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if got == "" {
			got = r.Header.Get("X-TwinFlow-Token")
		}
		if got != s.cfg.APIToken {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next(w, r)
	}
}

func (s *Server) secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Permitted-Cross-Domain-Policies", "none")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	allowed := map[string]struct{}{}
	for _, o := range s.cfg.CORS {
		allowed[o] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-TwinFlow-Token, X-Request-ID")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = fmt.Sprintf("%d", time.Now().UnixNano())
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r)
	})
}

func chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

func decodeJSON(r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.UseNumber()
	if err := dec.Decode(dst); err != nil {
		return fmt.Errorf("invalid json")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func writeEngineError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, regulator.ErrQueueFull):
		writeError(w, http.StatusTooManyRequests, "write queue full; retry later")
	case errors.Is(err, regulator.ErrTimeout):
		writeError(w, http.StatusGatewayTimeout, "regulator timeout")
	default:
		// Do not echo SQL or row data.
		writeError(w, http.StatusBadRequest, sanitizeErr(err))
	}
}

func sanitizeErr(err error) string {
	msg := err.Error()
	if len(msg) > 240 {
		msg = msg[:240]
	}
	return msg
}

func bool01(v bool) int {
	if v {
		return 1
	}
	return 0
}
