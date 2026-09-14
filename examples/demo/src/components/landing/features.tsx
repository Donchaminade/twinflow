import { Reveal } from "@/components/reveal";

const features = [
  {
    title: "Rate-limit et file",
    body: "Token bucket sur le primary, pool borné, file d’écriture. File pleine : 429, pas une nouvelle session Postgres.",
  },
  {
    title: "Miroir par table",
    body: "SQLite embarqué, sync incrémentale (~1 s) sur les tables que vous déclarez. Les lectures non-fresh n’ouvrent pas de connexion primary.",
  },
  {
    title: "fresh est une liste",
    body: "Soldes, paiements, permissions — ou n’importe quelle table que vous marquez. Un client ne peut pas forcer le miroir sur ces tables.",
  },
  {
    title: "Writes toujours primary",
    body: "INSERT, UPDATE, DELETE, DDL. Après le write, TwinFlow pousse la ligne au miroir au lieu d’attendre le tick.",
  },
  {
    title: "Agnostique",
    body: "Langage, framework, métier : hors sujet. L’app parle HTTP. Python, Go, Java, Node, curl — le contrat est le même.",
  },
  {
    title: "Cinq minutes en local",
    body: "Image non-root, Compose pour Postgres + sidecar + site. Un smoke-test sur votre machine, pas une plateforme à rejoindre.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="section mx-auto max-w-6xl px-4">
      <Reveal>
        <p className="eyebrow">Fonctions</p>
        <h2 className="section-title">Ce que v1 tient réellement.</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {features.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 45} className="glass p-6 md:p-7">
            <h3 className="font-heading text-xl md:text-2xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
