import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl tracking-tight">
        Conditions d&apos;utilisation
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 14 septembre 2026
      </p>
      <div className="mt-8 space-y-6 text-sm leading-7">
        <p>
          TwinFlow est publié sous licence MIT. Le logiciel est fourni « tel
          quel », sans garantie. Voir le fichier LICENSE du dépôt.
        </p>
        <h2 className="font-heading text-2xl">Cette démo</h2>
        <p>
          Le café sur <code className="code-inline">/demo</code> est une
          démonstration locale. Ce n&apos;est pas un système de paiement, de
          stock ou de commande en production. N&apos;y saisissez pas de données
          personnelles ou bancaires réelles.
        </p>
        <h2 className="font-heading text-2xl">Vos responsabilités</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Gardez les identifiants de base hors de git et hors des images
            Docker.
          </li>
          <li>
            Dimensionnez le régulateur pour qu&apos;un client buggé ne noie pas
            Postgres.
          </li>
          <li>
            Traitez le processus sidecar comme équivalent au rôle Postgres
            qu&apos;il utilise.
          </li>
        </ul>
        <h2 className="font-heading text-2xl">Usage acceptable</h2>
        <p>
          N&apos;utilisez pas TwinFlow pour dissimuler un accès non autorisé,
          contourner des contrôles que vous ne possédez pas, ou traiter des
          données que vous n&apos;avez pas le droit de stocker.
        </p>
      </div>
    </main>
  );
}
