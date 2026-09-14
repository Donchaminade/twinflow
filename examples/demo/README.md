# TwinFlow — landing et café démo

Site Next.js : landing marketing en français sur `/`, café interactif sur
`/demo`. Les routes serveur proxifient le sidecar pour que le navigateur ne
voie jamais `TWINFLOW_API_TOKEN`.

```bash
# depuis la racine du dépôt
docker compose up --build
# landing : http://127.0.0.1:43123
# café    : http://127.0.0.1:43123/demo
```

En local, sans Compose :

```bash
cd examples/demo
TWINFLOW_URL=http://127.0.0.1:8741 npm run dev
```

Routes : `/`, `/demo`, `/architecture`, `/privacy`, `/terms`. Le bandeau
cookies mémorise une seule préférence essentielle. Aucun tracker n'est
embarqué. Pour une vraie vidéo produit, déposez `public/demo/twinflow.mp4` et
renseignez `LANDING_DEMO_VIDEO` dans `src/lib/site.ts`.
