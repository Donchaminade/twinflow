import type { Metadata } from "next";

export const metadata: Metadata = { title: "Architecture — TwinFlow" };

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl">Architecture</h1>
      <p className="mt-4 text-muted-foreground">
        TwinFlow v1 is one Go process: an HTTP SQL API, a regulator, a router,
        a PostgreSQL pool, and an embedded SQLite mirror.
      </p>
      <pre className="mt-8 overflow-x-auto rounded-xl bg-foreground p-4 text-xs leading-6 text-background">
{`app (any language)
        │  POST /v1/query  |  POST /v1/exec
        ▼
   TwinFlow sidecar
     ├─ router   fresh table? mirror lagging? write?
     ├─ regulator  queue + token bucket (primary only)
     ├─ SQLite mirror   incremental (updated_at, pk) ~1s
     └─ pgx pool        max_conns, TLS
            │
            ▼
      PostgreSQL  ← source of truth`}
      </pre>
      <h2 className="font-heading mt-10 text-2xl">Routing rules</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
        <li>Writes always go to the central database.</li>
        <li>After a write, TwinFlow invalidates / upserts the concerned mirror tables immediately.</li>
        <li>Reads default to the mirror.</li>
        <li>
          A table or request marked <code>fresh: true</code> reads the central
          database.
        </li>
        <li>If the mirror is down or lag exceeds max_lag, reads fall back to primary.</li>
        <li>Under a spike, writes wait in the regulator queue; catalog reads stay on the mirror.</li>
      </ul>
      <h2 className="font-heading mt-10 text-2xl">Why not a full PG wire proxy in v1?</h2>
      <p className="mt-3 text-sm leading-7">
        A wire-compatible endpoint is the nicest DX long term. v1 ships the
        routing, sync, and regulator contracts with tests first. Swapping a DSN
        later should not require reinventing failover.
      </p>
      <h2 className="font-heading mt-10 text-2xl">Load impact</h2>
      <p className="mt-3 text-sm leading-7">
        Each synced table does one bounded incremental <code>SELECT</code> per
        second and a primary-key reconcile every 30s by default. Keep the table
        list to what you actually read. High-churn audit logs should stay
        <code> sync: false</code>.
      </p>
    </main>
  );
}
