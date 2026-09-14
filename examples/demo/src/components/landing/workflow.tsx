import { Reveal } from "@/components/reveal";

const hops = [
  {
    title: "Client",
    body: "Python, Go, Java, Node ou curl. POST JSON vers /v1/query et /v1/exec. Pas de SDK obligatoire.",
  },
  {
    title: "TwinFlow",
    body: "Le routeur tranche : lecture miroir, lecture fresh, ou écriture. Le régulateur borne le pool et met les writes en file.",
  },
  {
    title: "Miroir ou primary",
    body: "Tables configurées → SQLite local (~1 s). Tables fresh et tous les writes → PostgreSQL, puis invalidation immédiate du miroir.",
  },
];

export function LandingWorkflow() {
  return (
    <section id="workflow" className="section mx-auto max-w-6xl px-4">
      <Reveal>
        <p className="eyebrow">Flux</p>
        <h2 className="section-title">Client → sidecar → miroir / primary.</h2>
        <p className="section-lede">
          Un binaire et une config. Postgres reste la source de vérité. Le
          miroir n&apos;est pas un cache applicatif : c&apos;est une copie
          locale bornée, table par table — celles que vous listez.
        </p>
      </Reveal>

      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {hops.map((hop, i) => (
          <Reveal key={hop.title} as="li" delayMs={i * 80} className="glass relative p-6 md:p-7">
            <p className="font-mono text-xs text-primary">0{i + 1}</p>
            <h3 className="font-heading mt-3 text-xl md:text-2xl">{hop.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {hop.body}
            </p>
            {i < hops.length - 1 ? (
              <span className="workflow-arrow" aria-hidden>
                →
              </span>
            ) : null}
          </Reveal>
        ))}
      </ol>

      <Reveal delayMs={120} className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Requête</th>
              <th className="py-3 pr-4 font-medium">Destination</th>
              <th className="py-3 font-medium">Si ça casse</th>
            </tr>
          </thead>
          <tbody className="text-foreground/90">
            <tr className="border-b border-border/50">
              <td className="py-3 pr-4">Lecture, défaut</td>
              <td className="py-3 pr-4">Miroir</td>
              <td className="py-3 text-muted-foreground">
                Primary si lag &gt; seuil ou miroir down
              </td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-3 pr-4">
                Lecture <code className="code-inline">fresh</code>
              </td>
              <td className="py-3 pr-4">Primary</td>
              <td className="py-3 text-muted-foreground">Pas de contournement client</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">Write / DDL</td>
              <td className="py-3 pr-4">Primary, puis push miroir</td>
              <td className="py-3 text-muted-foreground">HTTP 429 si la file est pleine</td>
            </tr>
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}
