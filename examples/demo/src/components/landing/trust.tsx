import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { GITHUB_URL } from "@/lib/site";

const notes = [
  {
    title: "Open source MIT",
    body: "Licence permissive, code lisible, CI sur les tests sidecar, le lint du site et la revue de vulnérabilités.",
  },
  {
    title: "Postgres, v1",
    body: "Un sidecar, un primary, un fichier SQLite. MySQL et le protocole filaire sont sur la feuille de route — pas dans v1.",
  },
  {
    title: "Secrets hors dépôt",
    body: "Identifiants uniquement via l’environnement. Rien de sensible n’est commité. La config ne porte pas de mot de passe.",
  },
];

export function LandingTrust() {
  return (
    <section id="confiance" className="section border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="eyebrow">Confiance</p>
          <h2 className="section-title">Un outil d&apos;infra, pas une plateforme.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {notes.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 60} className="glass p-6 md:p-7">
              <h3 className="font-heading text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal delayMs={80} className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a href="#quickstart" className="btn-primary">
            Démarrer en local
          </a>
          <a href={GITHUB_URL} className="btn-ghost">
            Lire le dépôt
          </a>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            La{" "}
            <Link href="/demo" className="text-foreground underline-offset-4 hover:underline">
              démo café
            </Link>{" "}
            est un scénario illustratif — TwinFlow n&apos;est pas un logiciel
            de restauration.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
