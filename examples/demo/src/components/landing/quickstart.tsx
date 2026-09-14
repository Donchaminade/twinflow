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
    note: "Les secrets restent dans l'ENV. Rien de sensible n'est commité.",
  },
  {
    n: "03",
    title: "Composer",
    code: "docker compose up --build",
    note: "Postgres, TwinFlow et le site démo démarrent ensemble.",
  },
  {
    n: "04",
    title: "Santé",
    code: "curl -s http://127.0.0.1:8741/health",
  },
  {
    n: "05",
    title: "Café",
    code: "open http://127.0.0.1:43123/demo",
    note: "Le catalogue lit le miroir. Le stock et les commandes tapent le primary.",
  },
];

export function LandingQuickstart() {
  return (
    <section id="quickstart" className="border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <Reveal>
          <p className="eyebrow">Quickstart</p>
          <h2 className="font-heading mt-3 max-w-2xl text-3xl tracking-tight md:text-5xl">
            Branché en 5 minutes.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Docker et Compose suffisent. Sans conteneur&nbsp;: exportez{" "}
            <code className="code-inline">TWINFLOW_PRIMARY_URL</code> puis{" "}
            <code className="code-inline">go run ./cmd/twinflow</code>.
          </p>
        </Reveal>

        <ol className="mt-12 space-y-4">
          {steps.map((step, i) => (
            <Reveal key={step.n} as="li" delayMs={i * 60} className="glass p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="md:w-56">
                  <p className="font-mono text-xs text-primary">{step.n}</p>
                  <h3 className="font-heading mt-1 text-2xl">{step.title}</h3>
                  {step.note ? (
                    <p className="mt-2 text-sm text-muted-foreground">{step.note}</p>
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
