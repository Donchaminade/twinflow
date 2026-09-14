# Contributing to TwinFlow

Thanks for helping keep the sidecar small, predictable, and safe around other people's data.

## What belongs in a change

- Keep the sidecar language-agnostic. Prefer YAML/ENV and the HTTP SQL API over a new SDK.
- The central database stays the source of truth. Do not add a write path that lands only on the mirror.
- Do not log SQL arguments, row payloads, tokens, or connection strings.
- Secrets stay in the environment. Never add credentials to YAML, Dockerfiles, or tests.
- New tables in the demo must have a watermark column if they are synced.

## Dev loop

```bash
cp .env.example .env
go test ./...
go run ./cmd/twinflow
```

The demo site lives in `examples/demo`:

```bash
cd examples/demo
npm install
npm run dev -- --port 43123
```

## Tests we expect

Critical path coverage already exists for:

- SQL classification and multi-statement rejection (`internal/sqlparse`)
- Read/write routing, `fresh` tables, mirror lag and downtime (`internal/router`, `internal/engine`)
- Incremental sync, immediate post-write push, delete reconcile (`internal/mirror`)
- Write-queue shedding (`internal/regulator`)

Add or extend those packages when you touch routing, sync, or failover.

## Pull requests

1. One concern per PR.
2. `go test ./...` and, if you touched the demo, `npm run lint` + `npm run build` in `examples/demo`.
3. Describe load impact if you change sync or pool defaults.

## Security reports

Please do not open a public issue for a vulnerability that exposes data. Email the maintainers listed in the repository and give us time to patch before disclosing.
