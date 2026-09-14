# TwinFlow — landing et démo café

Site Next.js : landing marketing en français sur `/`, scénario café
illustratif sur `/demo`. Les routes serveur proxifient le sidecar pour que
le navigateur ne voie jamais le jeton d’API.

```bash
# depuis la racine du dépôt
docker compose up --build
# landing : http://127.0.0.1:43123
# démo café (exemple) : http://127.0.0.1:43123/demo
```

En local, sans Compose :

```bash
cd examples/demo
TWINFLOW_URL=http://127.0.0.1:8741 npm run dev
```

Routes : `/`, `/demo`, `/architecture`, `/privacy`, `/terms`. Le bandeau
cookies mémorise une seule préférence essentielle. Aucun tracker n'est
embarqué.

Sur Vercel, `/demo` proxifie le sidecar via les routes serveur. Sans sidecar
joignable, la page explique le café d’exemple en français et propose le film,
`docker compose up`, et — une fois publié — un lien de démo hébergée.

Variables côté projet Vercel **twinflow** (après un Blueprint Render) :

| Variable | Rôle |
|---|---|
| `TWINFLOW_URL` | Origine HTTPS publique du sidecar (sans slash final) |
| `TWINFLOW_API_TOKEN` | Même jeton que Render si le sidecar en exige un |
| `NEXT_PUBLIC_HOSTED_DEMO_URL` | Optionnel : CTA « démo hébergée » distincte |

Détail : [docs/hosting-render.md](../../docs/hosting-render.md). Blueprint :
[`render.yaml`](../../render.yaml).

La simulation produit (`public/demo/twinflow.mp4`) se régénère avec :

```bash
node scripts/render-demo-video.mjs
```
