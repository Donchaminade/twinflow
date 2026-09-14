import { Reveal } from "@/components/reveal";

const steps = [
  {
    n: "01",
    title: "Cloner",
    code: "git clone https://github.com/Donchaminade/twinflow.git\ncd twinflow",
  },
  {
    n: "02",
    title: "Environnement",
    code: "cp .env.example .env",
    note: "Les secrets restent hors du dépôt.",
  },
  {
    n: "03",
    title: "Composer",
    code: "docker compose up --build",
    note: "Postgres, TwinFlow et le site démarrent ensemble.",
  },
  {
    n: "04",
    title: "Santé",
    code: "curl -s http://127.0.0.1:8741/health",
  },
  {
    n: "05",
    title: "Démo café",
    code: "open http://127.0.0.1:43123/demo",
    note: "Scénario d’exemple uniquement. Le catalogue lit le miroir ; le stock et les commandes tapent le primary.",
  },
];

export function LandingQuickstart() {
  return (
    <section id="quickstart" className="section border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="eyebrow">Quickstart</p>
          <h2 className="section-title">Branché en 5 minutes.</h2>
          <p className="section-lede">
            Docker et Compose suffisent. Sans conteneur : pointez TwinFlow vers
            votre Postgres, puis lancez le binaire.
          </p>
        </Reveal>

        <ol className="mt-12 space-y-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} as="li" delayMs={i * 50} className="glass p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="md:w-56">
                  <p className="font-mono text-xs text-primary">{step.n}</p>
                  <h3 className="font-heading mt-1 text-xl md:text-2xl">{step.title}</h3>
                  {step.note ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.note}
                    </p>
                  ) : null}
                </div>
                <pre className="flex-1 overflow-x-auto rounded-xl bg-[oklch(0.1_0.02_240)] p-4 text-xs leading-6 text-foreground/90">
                  {step.code}
                </pre>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
