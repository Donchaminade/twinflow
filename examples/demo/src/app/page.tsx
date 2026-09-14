import { DemoConsole } from "@/components/demo-console";

export default function HomePage() {
  return (
    <main>
      <section className="border-b bg-[radial-gradient(circle_at_top_left,oklch(0.93_0.05_75),transparent_45%),radial-gradient(circle_at_80%_0%,oklch(0.94_0.03_50),transparent_40%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="mb-3 text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Language-agnostic database sidecar
          </p>
          <h1 className="font-heading max-w-3xl text-4xl leading-tight md:text-6xl">
            Keep the central database standing when traffic spikes.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            TwinFlow sits in front of PostgreSQL like an H2-style companion: a
            binary and a YAML file. It queues writes, caps connections, and
            serves non-critical reads from a local mirror that stays about a
            second behind the source of truth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a
              href="#live"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-primary-foreground"
            >
              Open the live café
            </a>
            <a
              href="#wire"
              className="inline-flex h-9 items-center rounded-lg border px-3"
            >
              Wire it in five minutes
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          {
            title: "Writes never guess",
            body: "INSERT, UPDATE, DELETE and DDL always hit Postgres. After the write, TwinFlow pushes the row to the local mirror instead of waiting for the next tick.",
          },
          {
            title: "Reads pick a side",
            body: "Catalog pages default to the mirror. Mark stock, balances, payments or permissions as fresh: true and they skip the cache on purpose.",
          },
          {
            title: "Spikes hit a queue, not the pool",
            body: "The regulator rate-limits primary traffic and sheds writes when the queue is full. Mirror reads stay local and do not open extra DB sessions.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-5">
            <h2 className="font-heading text-xl">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      <section id="live" className="border-y bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-heading text-3xl">Hello TwinFlow</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            This café talks to the sidecar over HTTP — the same API you would
            call from Python, Go, Java, or curl. Watch the inspector: catalog
            reads should say mirror; stock and orders should say primary.
          </p>
          <div className="mt-8">
            <DemoConsole />
          </div>
        </div>
      </section>

      <section id="wire" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-heading text-3xl">Wired in five minutes</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Start the stack",
              body: "cp .env.example .env && docker compose up --build. Postgres, TwinFlow, and this demo come up together.",
            },
            {
              n: "2",
              title: "Point the app at the sidecar",
              body: "POST /v1/query for reads, POST /v1/exec for writes. Any language. Optional bearer token from TWINFLOW_API_TOKEN.",
            },
            {
              n: "3",
              title: "Mark what must be fresh",
              body: "In configs/twinflow.yaml set fresh: true on stock, balances, payments. Everything else can live on the mirror.",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-xl border p-5">
              <p className="font-mono text-xs text-muted-foreground">Step {step.n}</p>
              <h3 className="mt-1 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
        <pre className="mt-8 overflow-x-auto rounded-xl bg-foreground p-4 text-xs text-background">
{`curl -s http://127.0.0.1:8741/v1/query \\
  -H 'content-type: application/json' \\
  -d '{"sql":"SELECT id, name FROM products"}'

# → "source": "mirror", "reason": "default_read_mirror"`}
        </pre>
      </section>
    </main>
  );
}
