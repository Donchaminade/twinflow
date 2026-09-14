# Security

TwinFlow sits in front of a database. Treat a compromised sidecar as equivalent to a compromised database role.

## Hardening checklist (v1)

- Run the sidecar as an isolated process (container user `twinflow`, uid 10001).
- Point `TWINFLOW_PRIMARY_URL` at a **least-privilege** role: only the tables TwinFlow is allowed to sync and query.
- Prefer `TWINFLOW_TLS_MODE=require` (or `sslmode=require` in the URL) outside local compose.
- Set `TWINFLOW_API_TOKEN` and keep `/v1/*` off the public internet. Put a reverse proxy in front if you must expose it.
- Bind `TWINFLOW_LISTEN` to a private interface in production.
- Keep `primary.max_conns`, `rate_limit_rps`, and `write_queue_size` conservative so a bug in an app cannot open unbounded sessions.
- Do not enable verbose query logging. TwinFlow redacts tokens, SQL args, and row payloads on purpose.

## What TwinFlow does not do in v1

- It is not a firewall, WAF, or row-level authorization layer.
- It does not encrypt the local SQLite mirror at rest. Protect the host volume.
- It does not rotate credentials. Use your secret manager / orchestrator.

## Reporting

If you find a vulnerability, contact the maintainers privately. Do not attach dumps, credentials, or customer data to the report.
