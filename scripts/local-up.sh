#!/usr/bin/env bash
# Start TwinFlow + the demo against a local Postgres (no Docker required).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL 16+ or use: docker compose up --build" >&2
  exit 1
fi

export TWINFLOW_PRIMARY_URL="${TWINFLOW_PRIMARY_URL:-postgres://twinflow:twinflow-local@127.0.0.1:5432/cafe?sslmode=disable}"
export TWINFLOW_TLS_MODE="${TWINFLOW_TLS_MODE:-disable}"
export TWINFLOW_LISTEN="${TWINFLOW_LISTEN:-0.0.0.0:8741}"
export TWINFLOW_MIRROR_PATH="${TWINFLOW_MIRROR_PATH:-$root/data/mirror.db}"
export TWINFLOW_CONFIG="${TWINFLOW_CONFIG:-$root/configs/twinflow.yaml}"
export TWINFLOW_URL="${TWINFLOW_URL:-http://127.0.0.1:8741}"
export PORT="${PORT:-43123}"
export GOTOOLCHAIN=local

mkdir -p "$root/data"
echo "starting sidecar on $TWINFLOW_LISTEN"
go run ./cmd/twinflow -config "$TWINFLOW_CONFIG" &
trap 'kill 0' EXIT
sleep 1
cd "$root/examples/demo"
npm run dev
