import type { Metadata } from "next";

export const metadata: Metadata = { title: "Architecture" };

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl tracking-tight">Architecture</h1>
      <p className="mt-4 text-muted-foreground">
        TwinFlow v1 est un processus Go : API SQL HTTP, régulateur, routeur,
        pool PostgreSQL, miroir SQLite embarqué. Il n&apos;est lié à aucun
        métier — n&apos;importe quel schéma Postgres se déclare en config.
      </p>
      <pre className="mt-8 overflow-x-auto rounded-xl bg-[oklch(0.1_0.02_240)] p-4 text-xs leading-6 text-foreground/90">
{`app (n'importe quel langage)
        │  POST /v1/query  |  POST /v1/exec
        ▼
   TwinFlow sidecar
     ├─ routeur    table fresh ? miroir en retard ? write ?
     ├─ régulateur file + token bucket (primary seulement)
     ├─ miroir SQLite   incrémental (updated_at, pk) ~1s
     └─ pool pgx        max_conns, TLS
            │
            ▼
      PostgreSQL  ← source de vérité`}
      </pre>
      <h2 className="font-heading mt-10 text-2xl">Règles de routage</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7">
        <li>Les writes vont toujours à la base centrale.</li>
        <li>
          Après un write, TwinFlow invalide / upsert les tables miroir
          concernées tout de suite.
        </li>
        <li>Les lectures vont au miroir par défaut.</li>
        <li>
          Une table ou une requête <code className="code-inline">fresh: true</code>{" "}
          lit la base centrale.
        </li>
        <li>
          Si le miroir est down ou que le lag dépasse max_lag, fallback primary.
        </li>
        <li>
          Sous un pic, les writes attendent dans la file ; les lectures
          catalogue restent sur le miroir.
        </li>
      </ul>
      <h2 className="font-heading mt-10 text-2xl">
        Pourquoi pas un proxy filaire PG en v1 ?
      </h2>
      <p className="mt-3 text-sm leading-7">
        Un endpoint compatible filaire est le meilleur DX à terme. v1 livre
        d&apos;abord le contrat de routage, de sync et de régulation, avec des
        tests. Changer de DSN plus tard ne doit pas obliger à réinventer le
        failover.
      </p>
      <h2 className="font-heading mt-10 text-2xl">Impact de charge</h2>
      <p className="mt-3 text-sm leading-7">
        Chaque table synchronisée fait un <code className="code-inline">SELECT</code>{" "}
        incrémental borné par seconde et une réconciliation de clés toutes les
        30&nbsp;s par défaut. Limitez la liste à ce que vous lisez vraiment.
        Les journaux d&apos;audit à fort churn restent{" "}
        <code className="code-inline">sync: false</code>.
      </p>
    </main>
  );
}
