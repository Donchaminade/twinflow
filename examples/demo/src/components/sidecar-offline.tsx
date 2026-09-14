import Link from "next/link";
import { HOSTED_DEMO_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";

type Props = {
  onRetry: () => void;
  busy?: boolean;
};

export function SidecarOfflinePanel({ onRetry, busy }: Props) {
  return (
    <section className="sidecar-offline" aria-live="polite">
      <p className="eyebrow">Café d’exemple</p>
      <h2 className="font-heading mt-3 text-2xl tracking-tight md:text-3xl">
        Le café interactif a besoin du sidecar TwinFlow
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Cette page n’est pas le produit : c’est un schéma illustratif (catalogue,
        stock, commandes) branché sur TwinFlow. Le sidecar — le petit processus
        qui s’intercale devant Postgres — n’est pas joignable depuis cet
        hébergement pour le moment. Sans lui, on ne peut pas passer de vraies
        lectures ou écritures.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Le film et le simulateur de l’accueil montrent le même contrat, sans
        installer quoi que ce soit. Si un sidecar public se réveille, réessayez
        cette page.
      </p>

      <ol className="sidecar-offline-options">
        <li className="sidecar-offline-card">
          <p className="sidecar-offline-kicker">01</p>
          <h3>Voir le film et le simulateur</h3>
          <p>
            Trente secondes pour voir miroir, primary et régulateur — aucun
            processus à lancer.
          </p>
          <Link href="/#demo" className="btn-primary mt-4 w-fit">
            Aller à la simulation
          </Link>
        </li>
        <li className="sidecar-offline-card">
          <p className="sidecar-offline-kicker">02</p>
          <h3>Lancer la stack en local</h3>
          <p>
            Sur votre machine : sidecar, Postgres d’exemple et ce café, d’un
            seul ordre.
          </p>
          <pre className="sidecar-offline-code">
            <code>docker compose up</code>
          </pre>
        </li>
        <li className="sidecar-offline-card">
          <p className="sidecar-offline-kicker">03</p>
          <h3>Démo hébergée</h3>
          {HOSTED_DEMO_URL ? (
            <>
              <p>
                Une instance publique du café d’exemple est disponible. C’est
                toujours un schéma illustratif, pas un logiciel de restauration.
              </p>
              <a
                href={HOSTED_DEMO_URL}
                className="btn-ghost mt-4 w-fit"
                rel="noreferrer"
              >
                Ouvrir la démo hébergée
              </a>
            </>
          ) : (
            <p>
              Pas encore de lien public séparé. Dès qu’un sidecar hébergé sera
              branché sur ce site, cette même page s’animera — en attendant, le
              film reste le meilleur aperçu.
            </p>
          )}
        </li>
      </ol>

      <div className="mt-6">
        <Button type="button" variant="outline" onClick={onRetry} disabled={busy}>
          Réessayer la connexion
        </Button>
      </div>
    </section>
  );
}
