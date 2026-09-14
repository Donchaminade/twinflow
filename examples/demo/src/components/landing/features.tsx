import { Reveal } from "@/components/reveal";

const features = [
  {
    title: "Rate-limit et file",
    body: "Token bucket sur le primary, pool borné, file d'écriture. File pleine : 429, pas une nouvelle session Postgres.",
  },
  {
    title: "Miroirs locaux",
    body: "SQLite embarqué, sync incrémentale (~1 s) par table. Les lectures catalogue n'ouvrent pas de connexion primary.",
  },
  {
    title: "Lectures fresh",
    body: "Stock, soldes, paiements, permissions : fresh: true. Un client ne peut pas forcer le miroir sur ces tables.",
  },
  {
    title: "Writes toujours primary",
    body: "INSERT, UPDATE, DELETE, DDL. Après le write, TwinFlow pousse la ligne au miroir au lieu d'attendre le tick.",
  },
  {
    title: "Sidecar agnostique",
    body: "Binaire + YAML. L'app parle HTTP. Python, Go, Java, Node, curl — le contrat est le même.",
  },
  {
    title: "Docker",
    body: "Image non-root, Compose pour Postgres + sidecar + démo. Prêt pour un smoke-test local en cinq minutes.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <Reveal>
        <p className="eyebrow">Fonctions</p>
        <h2 className="font-heading mt-3 max-w-2xl text-3xl tracking-tight md:text-5xl">
          Ce que v1 tient réellement.
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {features.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 55} className="glass p-6">
            <h3 className="font-heading text-2xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
