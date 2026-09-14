import type { Metadata } from "next";
import Link from "next/link";
import { DemoConsole } from "@/components/demo-console";

export const metadata: Metadata = {
  title: "Démo café — exemple illustratif",
  description:
    "Scénario d’exemple : un petit café pour montrer le routage TwinFlow. Le produit n’est pas un logiciel de restauration — il s’adapte à n’importe quel schéma Postgres.",
};

export default function DemoPage() {
  return (
    <main>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="eyebrow">Scénario d’exemple</p>
          <h1 className="font-heading mt-3 max-w-3xl text-4xl tracking-tight md:text-6xl">
            Démo café
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Ce café n&apos;est pas le produit. C&apos;est une application
            d&apos;exemple branchée sur TwinFlow — le même sidecar HTTP que
            vous appelleriez depuis Python, Go, Java ou curl, sur{" "}
            <em>votre</em> schéma.
          </p>
          <div className="callout mt-8 max-w-2xl">
            <p className="font-medium text-foreground">
              TwinFlow n&apos;est pas un logiciel de restauration.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Catalogue, stock et commandes illustrent seulement le contrat :
              lectures non-fresh → miroir ; tables{" "}
              <code className="code-inline">fresh</code> et writes → primary.
              Remplacez-les par users, invoices, events — ou n&apos;importe
              quelles tables. Voir{" "}
              <Link href="/#schema" className="text-foreground underline-offset-4 hover:underline">
                branchez votre schéma
              </Link>
              .
            </p>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Le café interactif parle au sidecar TwinFlow. S&apos;il n&apos;est
            pas joignable, le{" "}
            <Link href="/#demo" className="text-foreground underline-offset-4 hover:underline">
              film et le simulateur
            </Link>{" "}
            restent disponibles sur l&apos;accueil.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <DemoConsole />
      </section>
    </main>
  );
}
