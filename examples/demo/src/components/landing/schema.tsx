import Link from "next/link";
import { Reveal } from "@/components/reveal";

export function LandingAnySchema() {
  return (
    <section id="schema" className="section border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="eyebrow">Indépendant du métier</p>
          <h2 className="section-title">
            Pas lié à un métier : branchez votre schéma.
          </h2>
          <p className="section-lede">
            TwinFlow est un sidecar. Il ne connaît ni les cafés, ni la
            facturation, ni votre produit. Vous déclarez des tables.{" "}
            <code className="code-inline">fresh</code> est une liste. Le miroir
            synchronise ce que vous configurez. Les writes vont toujours au
            primary.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal className="glass p-6 md:p-8">
            <p className="eyebrow">Config</p>
            <h3 className="font-heading mt-2 text-2xl">N’importe quelles tables</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Un binaire, un fichier de config, n’importe quel langage. Le
              métier reste dans votre application.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-xl bg-[oklch(0.1_0.02_240)] p-4 text-xs leading-6 text-foreground/90">
{`tables:
  - name: users
    fresh: false
    sync: true
  - name: invoices
    fresh: true
    sync: true
  - name: events
    fresh: false
    sync: true`}
            </pre>
          </Reveal>

          <Reveal delayMs={80} className="glass p-6 md:p-8">
            <p className="eyebrow">Même contrat</p>
            <h3 className="font-heading mt-2 text-2xl">SQL générique</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Lectures catalogue, factures à jour, événements en rafale —
              le routage dépend de la config, pas du secteur.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-xl bg-[oklch(0.1_0.02_240)] p-4 text-xs leading-6 text-foreground/90">
{`SELECT id, email FROM users
-- → miroir

SELECT total FROM invoices
-- → primary  (fresh)

SELECT name FROM events
-- → miroir

INSERT INTO invoices (…)
-- → primary, puis push miroir`}
            </pre>
          </Reveal>
        </div>

        <Reveal delayMs={100} className="callout mt-8">
          <p className="font-medium text-foreground">
            Le café n’est qu’un exemple.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            La page{" "}
            <Link href="/demo" className="text-foreground underline-offset-4 hover:underline">
              Démo café
            </Link>{" "}
            montre le même sidecar sur un petit schéma illustratif
            (catalogue, stock, commandes). TwinFlow fonctionne avec n’importe
            quel schéma Postgres — le vôtre.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
