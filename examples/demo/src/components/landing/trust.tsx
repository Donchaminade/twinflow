import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { GITHUB_URL } from "@/lib/site";

const notes = [
  {
    title: "Open source MIT",
    body: "Licence permissive, code lisible, CI sur go test, lint démo et govulncheck.",
  },
  {
    title: "Postgres, v1",
    body: "Un sidecar, un primary, un fichier SQLite. MySQL et le protocole filaire sont sur la feuille de route — pas dans v1.",
  },
  {
    title: "Secrets hors dépôt",
    body: "DSN et token uniquement via ENV. .env.example est le seul fichier commité. YAML sans mot de passe.",
  },
];

export function LandingTrust() {
  return (
    <section id="confiance" className="border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <Reveal>
          <p className="eyebrow">Confiance</p>
          <h2 className="font-heading mt-3 max-w-2xl text-3xl tracking-tight md:text-5xl">
            Un outil d&apos;infra, pas une plateforme.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {notes.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 70} className="glass p-6">
              <h3 className="font-heading text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal delayMs={80} className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a href="#quickstart" className="btn-primary">
            Démarrer en local
          </a>
          <a href={GITHUB_URL} className="btn-ghost">
            Lire le dépôt
          </a>
          <p className="text-sm text-muted-foreground">
            Le café interactif reste sur{" "}
            <Link href="/demo" className="text-foreground underline-offset-4 hover:underline">
              /demo
            </Link>{" "}
            — il parle au sidecar, pas à cette page marketing.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
