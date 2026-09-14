// Package logx configures structured logging without business payloads.
package logx

import (
	"log/slog"
	"os"
	"strings"
)

func New(level string) *slog.Logger {
	var lv slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lv = slog.LevelDebug
	case "warn":
		lv = slog.LevelWarn
	case "error":
		lv = slog.LevelError
	default:
		lv = slog.LevelInfo
	}
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lv,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			k := strings.ToLower(a.Key)
			switch k {
			case "sql_args", "args", "password", "secret", "token", "authorization", "row", "rows", "payload":
				return slog.String(a.Key, "[redacted]")
			}
			return a
		},
	})
	return slog.New(h)
}
