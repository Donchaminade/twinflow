# TwinFlow architecture (v1)

```
┌─────────────┐   HTTP SQL API    ┌──────────────────────────────┐
│ Any app     │ ───────────────►  │ TwinFlow sidecar             │
│ (any lang)  │                   │  regulator (queue + RPS)     │
└─────────────┘                   │  router (fresh / lag / R/W)  │
                                  │  ┌─────────┐  ┌───────────┐  │
                                  │  │ SQLite  │  │ PG pool   │  │
                                  │  │ mirror  │  │ (central) │  │
                                  │  └─────────┘  └───────────┘  │
                                  └───────────┬──────────────────┘
                                              │ TLS when configured
                                              ▼
                                       ┌────────────┐
                                       │ PostgreSQL │  source of truth
                                       └────────────┘
```

## Why a sidecar, not an SDK

The integration surface is a binary + YAML/ENV + `POST /v1/query` and `POST /v1/exec`. Any language that can speak HTTP can sit behind TwinFlow. Official clients are a later convenience, not a requirement.

A PostgreSQL wire-protocol proxy is the natural next step for “drop-in DSN swap”. It is deliberately out of v1 so the routing and sync contracts can stay testable and small.

## Read / write contract

| Operation | Destination | Notes |
|---|---|---|
| Write (`INSERT`/`UPDATE`/`DELETE`/DDL) | Central DB | Always. Enqueued and rate-limited. |
| After a write | Local mirror | Immediate upsert/delete from `RETURNING *`, then the 1s incremental loop. |
| Read, table `fresh: false` | Mirror | Default. Absorbs spikes. |
| Read, table `fresh: true` or `{"fresh":true}` | Central DB | Balances, stock, payments, permissions. |
| Read, mirror down or lag > `max_lag` | Central DB | Failover. The app sees `source` + `reason` in the JSON. |

The request cannot force a `fresh: false` override on a table marked fresh in config. Safety wins.

## Sync

1. **Bootstrap** — introspect `public` schema, create SQLite tables, pull rows in `batch_size` pages ordered by `(watermark, pk)`.
2. **Incremental (~1s)** — `WHERE (updated_at, pk) > last_cursor`. No full-table copy on a healthy cursor.
3. **Reconcile (default 30s)** — compare primary PK set to the mirror to catch deletes that did not flow through TwinFlow.
4. **Immediate push** — writes executed via `/v1/exec` append `RETURNING *` when missing and patch the mirror before the next tick.

Load impact: each synced table issues one bounded `SELECT` per tick, plus a PK list every reconcile interval. Keep `tables` to the working set you actually read. Do not point TwinFlow at high-churn audit logs unless you need them locally.

Watermark column is required for incremental sync (`updated_at` by default). Tables without it should be marked `sync: false` and will always read from primary.

## Regulator

- **Pool** — `pgx` pool, `max_conns` / `min_conns`.
- **Rate limit** — token bucket on *primary* traffic only. Mirror reads skip it.
- **Write queue** — bounded semaphore. When it is full, TwinFlow returns HTTP 429 instead of buffering an unbounded spike toward Postgres.

## Failover

`internal/router` is the only place destination is chosen. If the mirror is not ready, its last error is set, or measured lag exceeds `max_lag`, reads go to primary. A mirror query error at runtime also falls back.

## Deliberate v1 limits

- PostgreSQL only (MySQL adapter is a `store.Primary` implementation away).
- One sidecar ↔ one primary ↔ one local SQLite file. No multi-region mesh.
- HTTP SQL API, not the Postgres wire protocol.
- No application-level cache, no CDN, no full-table logical replication slot.
- No official multi-language SDKs.

## Privacy and logging

Logs record statement *kind*, table names, destination, duration, and request id. SQL arguments, row bodies, tokens, and passwords are redacted by `internal/logx`.
