# Hello TwinFlow demo

Next.js café that talks to the sidecar through server-side routes so the
browser never sees `TWINFLOW_API_TOKEN`.

```bash
# from the repository root
docker compose up --build
# open http://127.0.0.1:43123
```

Locally, without Compose:

```bash
cd examples/demo
TWINFLOW_URL=http://127.0.0.1:8741 npm run dev -- --port 43123 --hostname 0.0.0.0
```

Routes: `/` live demo, `/architecture`, `/privacy`, `/terms`. Cookie banner
stores a single essential preference. No analytics ship with this app.
