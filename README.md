# TwinFlow

TwinFlow is a language-agnostic database sidecar. It sits in front of PostgreSQL, absorbs traffic spikes, and keeps a local mirror that can serve non-critical reads about a second behind the central database.

Think of the DX as “H2 next to Spring Boot”, except the companion is a **binary + YAML/ENV file**, not a Java-only library. Python, Go, Java, Node, curl — anything that can POST JSON works. Official SDKs are optional later.

The central database is always the source of truth.

## What v1 does

1. **Regulate traffic** — bounded connection pool, token-bucket rate limit on primary traffic, and a write queue that returns HTTP 429 when it is full instead of opening unbounded sessions.
2. **Local virtual DB** — an embedded SQLite mirror per sidecar instance, incrementally synced (~1s) per configured table. If the mirror is lagging or down, reads fall back to Postgres.

```
any app ──HTTP SQL API──► TwinFlow ──pgx pool──► PostgreSQL (source of truth)
                              │
                              └── SQLite mirror (non-critical reads)
```

## Quickstart (about five minutes)

Prerequisites: Docker and Docker Compose.

```bash
git clone https://github.com/Donchaminade/twinflow.git
cd twinflow
cp .env.example .env
docker compose up --build
```

- Sidecar API: [http://127.0.0.1:8741/health](http://127.0.0.1:8741/health)
- Landing: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- Café demo: [http://127.0.0.1:43123/demo](http://127.0.0.1:43123/demo)

The demo catalog is a **mirror read**. Stock is a **fresh** table (always primary). Placing an order is a **write** to Postgres, then an immediate push to the mirror. The inspector on the page shows `source` and `reason` for each hop.

Without Docker, run Postgres yourself, export `TWINFLOW_PRIMARY_URL`, then:

```bash
go run ./cmd/twinflow -config configs/twinflow.yaml
```

### Wire an existing app

```bash
# Non-critical read → local mirror
curl -s http://127.0.0.1:8741/v1/query \
  -H 'content-type: application/json' \
  -d '{"sql":"SELECT id, name FROM products"}'

# Fresh read → central DB (also happens automatically for tables marked fresh)
curl -s http://127.0.0.1:8741/v1/query \
  -H 'content-type: application/json' \
  -d '{"sql":"SELECT product_id, quantity FROM stock","fresh":true}'

# Write → always central DB, then mirror invalidation
curl -s http://127.0.0.1:8741/v1/exec \
  -H 'content-type: application/json' \
  -d '{"sql":"INSERT INTO orders (product_id, quantity) VALUES ($1, $2)","args":[1,1]}'
```

If `TWINFLOW_API_TOKEN` is set, send `Authorization: Bearer <token>`.

Use **bound parameters** (`$1`, `$2`). TwinFlow rejects multiple statements. It is a proxy, not a permission system: the Postgres role you give it is the access it has.

## Read / write rules

| Kind | Destination | Fallback |
|---|---|---|
| Write | Central DB, through the regulator queue | None — 429 if the queue is full |
| After write | Immediate upsert/delete on the concerned mirror tables | Next incremental tick |
| Read, `fresh: false` | Local mirror | Central DB if mirror is down or lag `> max_lag` |
| Read, table or request `fresh: true` | Central DB | — |

A client cannot force `fresh: false` on a table you marked fresh in config (stock, balances, payments, permissions).

Under a spike: writes queue; catalog-style reads stay on the mirror and do not consume pool connections.

## Configuration

YAML (`configs/twinflow.yaml`) plus environment overrides. **Credentials never go in YAML.**

| Variable | Purpose | Default |
|---|---|---|
| `TWINFLOW_PRIMARY_URL` | Postgres DSN (required) | — |
| `TWINFLOW_API_TOKEN` | Bearer token for `/v1/*` | empty (open, local only) |
| `TWINFLOW_LISTEN` | HTTP bind | `:8741` |
| `TWINFLOW_MIRROR_PATH` | SQLite file | `data/mirror.db` |
| `TWINFLOW_TLS_MODE` | `disable` / `prefer` / `require` | `prefer` |
| `TWINFLOW_SYNC_INTERVAL` | Incremental pull | `1s` |
| `TWINFLOW_MAX_MIRROR_LAG` | Fallback threshold | `3s` |
| `TWINFLOW_RATE_LIMIT_RPS` | Primary token bucket | `50` |
| `TWINFLOW_MAX_CONNS` | Pool size | `8` |
| `TWINFLOW_FRESH_TABLES` | Comma-separated override | `stock` |
| `TWINFLOW_CORS_ORIGINS` | Allowed browser origins | demo ports |

Tables in YAML:

```yaml
tables:
  - name: products
    fresh: false          # reads may use the mirror
    sync: true
    watermark: updated_at # required for incremental sync
    pk: id
  - name: stock
    fresh: true           # every read hits Postgres
    sync: true
    watermark: updated_at
    pk: product_id
```

Incremental sync uses `(watermark, pk) > last_cursor` in pages of `batch_size` (default 500). TwinFlow does **not** full-scan a healthy table every second. A PK reconcile every `reconcile_interval` (default 30s) catches deletes that did not flow through the sidecar. Keep the table list small — each synced table is one bounded select per tick plus a PK list on reconcile.

See [docs/architecture.md](docs/architecture.md) for the load discussion.

## Health and metrics

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | no | Process liveness |
| `GET /ready` | no | Primary ping; `degraded` if the mirror is not ready |
| `GET /metrics` | no | Prometheus text (lag, queue, pool) |
| `GET /v1/status` | token | JSON routing + table watermarks |
| `POST /v1/query` | token | Reads |
| `POST /v1/exec` | token | Writes |

Responses include `source` (`mirror` \| `primary`) and `reason` so you can assert the contract in tests.

## Privacy, security, sustainability

- Data minimization: logs record statement kind, table names, destination, duration, request id. SQL args, rows, tokens, and passwords are redacted.
- Secrets via ENV only. `.env.example` is the committed template.
- TLS to Postgres when `sslmode`/`TWINFLOW_TLS_MODE=require` is set. Local Compose uses `disable` on the private network.
- Sidecar runs as non-root uid `10001` in Docker.
- HTTP headers: `nosniff`, `DENY` frames, `no-store`, locked CSP on the API.
- Demo site: Privacy Policy, Terms, cookie banner (accept / refuse / preferences). No non-essential trackers exist to enable.
- Resource limits are configurable (`max_conns`, RPS, queue, batch size).
- Dependabot watches Go, npm, Actions, and Docker. CI runs `go test`, `go vet`, demo lint/build, and `govulncheck`.

Read [SECURITY.md](SECURITY.md) before exposing the sidecar.

## Repository map

```
cmd/twinflow/          process entry
internal/config/       YAML + ENV
internal/sqlparse/     single-statement classify + table extract
internal/router/       R/W + fresh + lag decisions
internal/regulator/    queue + rate limit
internal/primary/      PostgreSQL pool
internal/mirror/       SQLite + incremental sync
internal/engine/       orchestration
internal/api/          HTTP + headers
configs/twinflow.yaml
examples/init.sql      café seed
examples/demo/         Next.js landing + café `/demo` + legal pages
docs/architecture.md
Dockerfile             sidecar image
docker-compose.yml     Postgres + sidecar + demo
```

## Tests

```bash
make test
# or
go test ./cmd/... ./internal/...
```

Critical path covered: SQL routing, `fresh` tables, mirror lag/down failover, incremental sync, immediate post-write push, delete reconcile, write-queue shedding.

## v1 limits (deliberate)

- PostgreSQL only. MySQL is a `store.Primary` implementation, not a rewrite.
- One sidecar, one primary, one local SQLite file. No multi-region mesh.
- HTTP SQL API. Postgres wire protocol is on the roadmap.
- No application cache, no CDN, no logical-replication slot.
- No official multi-language SDKs.
- Mirror is not encrypted at rest. Protect the volume.
- Incremental sync expects a watermark column (`updated_at` by default).

## Roadmap

- PostgreSQL wire-protocol listener (drop-in DSN).
- MySQL primary adapter.
- Optional logical replication for delete-accurate sync without a watermark.
- Thin clients (Go, TypeScript, Python) that still speak the same HTTP contract.
- Encrypted-at-rest mirror and multi-instance invalidation bus.

## License

[MIT](LICENSE)
