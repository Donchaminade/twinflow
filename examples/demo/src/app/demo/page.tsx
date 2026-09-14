import type { Metadata } from "next";
import { DemoConsole } from "@/components/demo-console";

export const metadata: Metadata = {
  title: "Café démo",
  description:
    "Café TwinFlow : lectures catalogue sur le miroir, stock et commandes sur le primary.",
};

export default function DemoPage() {
  return (
    <main>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="eyebrow">Démo locale</p>
          <h1 className="font-heading mt-3 max-w-3xl text-4xl tracking-tight md:text-6xl">
            Hello TwinFlow
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Ce café parle au sidecar en HTTP — le même contrat depuis Python,
            Go, Java ou curl. L&apos;inspecteur affiche{" "}
            <code className="code-inline">source</code> et{" "}
            <code className="code-inline">reason</code> : le catalogue doit
            dire miroir ; le stock et les commandes, primary.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Sur Vercel, le sidecar n&apos;est pas démarré. Lancez{" "}
            <code className="code-inline">docker compose up</code> en local
            pour exercer le café.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <DemoConsole />
      </section>
    </main>
  );
}
