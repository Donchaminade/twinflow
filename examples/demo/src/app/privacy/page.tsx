import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl tracking-tight">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 14 septembre 2026
      </p>
      <div className="mt-8 space-y-6 text-sm leading-7">
        <p>
          TwinFlow est un sidecar local. Ce site est une vitrine et une démo
          développeur. Nous collectons le moins possible. Le sidecar n&apos;écrit
          jamais les arguments SQL, le corps des lignes, les mots de passe ni
          les jetons dans les journaux.
        </p>
        <h2 className="font-heading text-2xl">Ce que ce site stocke</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Une préférence de consentement dans votre navigateur (
            <code className="code-inline">twinflow-cookie-consent</code>).
            C&apos;est le seul cookie.
          </li>
          <li>
            Les commandes du café sur <code className="code-inline">/demo</code>
            , uniquement dans le Postgres Docker que vous lancez. Ces données
            ne quittent pas votre machine.
          </li>
        </ul>
        <h2 className="font-heading text-2xl">Ce que nous ne faisons pas</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Pas d&apos;analytics, de publicité, ni de pixels sociaux.</li>
          <li>Pas de vente de données personnelles — il n&apos;y en a pas.</li>
          <li>
            Pas de comptes, pas de liste e-mail, pas de sous-traitant sur cette
            démo.
          </li>
        </ul>
        <h2 className="font-heading text-2xl">Quand vous auto-hébergez TwinFlow</h2>
        <p>
          Vous êtes responsable de la base que le sidecar proxifie. Donnez-lui
          un rôle à moindre privilège, gardez les identifiants dans
          l&apos;environnement, et n&apos;exposez pas{" "}
          <code className="code-inline">/v1/*</code> sur Internet sans
          authentification.
        </p>
        <h2 className="font-heading text-2xl">Contact</h2>
        <p>
          Pour une question de confidentialité sur ce projet, ouvrez une issue
          sur le dépôt TwinFlow. N&apos;y joignez ni dumps ni secrets.
        </p>
      </div>
    </main>
  );
}
