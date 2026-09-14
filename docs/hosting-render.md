# Host the TwinFlow sidecar on Render

The public marketing site lives on Vercel (`twinflow`, root `examples/demo`).
The interactive café on `/demo` talks to TwinFlow through server-side
`/api/tf/*` routes. Those routes need a running sidecar.

This repository ships a Blueprint at [`render.yaml`](../render.yaml):

| Resource | Role |
|---|---|
| `twinflow-demo-pg` | Free Postgres (`cafe`), seeded on sidecar boot from `examples/init.sql` |
| `twinflow-sidecar` | Free Go web service, health check `GET /health` |

The café remains an **illustrative example**, not TwinFlow’s product domain.

## What the Blueprint does not do

Render cannot be fully provisioned from this repo alone. You still need a
Render account, GitHub access, and a one-time Apply in the Dashboard.
Vercel environment variables are also set by hand.

Do not add paid plans unless you choose to. Free web services **spin down
after about 15 minutes of inactivity** (cold start on the next request).
Free Postgres **expires after 30 days**.

## 1. Apply the Blueprint

1. Merge `render.yaml` to the branch Render should track (usually `main`).
2. Open [New Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Donchaminade/twinflow) (complete GitHub OAuth if asked).
3. Review the two resources. Confirm **free** plans — this file does not request upgrades.
4. Click **Apply**. Wait until Postgres is available and the web service is **Live**.
5. Open the sidecar URL (`https://<name>.onrender.com/health`). You want `{"status":"ok",…}`.

Render generates `TWINFLOW_API_TOKEN` (`generateValue: true`). Copy it from the
service **Environment** tab. **Do not commit it.**

`TWINFLOW_SEED_SQL=examples/init.sql` applies the café schema on boot. The
file is idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).

The sidecar binds `0.0.0.0:$PORT` when `TWINFLOW_LISTEN` is unset (Render
injects `PORT`). CORS allows `https://twinflow-eosin.vercel.app` and localhost
demo ports. The Next.js site proxies the API, so browsers never send the token.

The SQLite mirror lives at `/tmp/twinflow-mirror.db` (ephemeral). After a
spin-down it rebuilds from Postgres.

## 2. Point Vercel at the sidecar

In the Vercel project **twinflow** → Settings → Environment Variables,
set these on **Production** (and Preview if you want `/demo` live on PRs):

| Name | Value | Secret? |
|---|---|---|
| `TWINFLOW_URL` | Public sidecar origin, no trailing slash — e.g. `https://twinflow-sidecar.onrender.com` | no |
| `TWINFLOW_API_TOKEN` | Same value Render generated | **yes** |

Optional, build-time only:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_HOSTED_DEMO_URL` | Extra CTA on the offline panel if you publish a separate café URL. Leave empty if `/demo` on this site *is* the hosted demo. |

Then **Redeploy** the production deployment so server routes pick up the new
values. `TWINFLOW_URL` is server-only (not `NEXT_PUBLIC_`); the browser never
sees the sidecar origin or the token.

After that, `https://twinflow-eosin.vercel.app/demo` should load the café.
If the free sidecar is asleep, the first request may fail and `/demo` will
show the offline panel — use **Réessayer la connexion**.

## 3. Local instead of Render

```bash
cp .env.example .env
docker compose up --build
```

Landing: http://127.0.0.1:43123 — café: http://127.0.0.1:43123/demo

## Checklist if something is missing

- [ ] Blueprint applied in the Render Dashboard (YAML in Git is not enough)
- [ ] Sidecar `/health` returns 200
- [ ] `TWINFLOW_URL` on Vercel is the **https** origin, no path, no slash
- [ ] `TWINFLOW_API_TOKEN` matches Render exactly
- [ ] Vercel redeployed after the env change
- [ ] Free Postgres still within its 30-day window
