"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_COOKIE_PREFS_EVENT } from "@/lib/site";

type Consent = "unset" | "essential" | "refused" | "all";

const KEY = "twinflow-cookie-consent";

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>("unset");
  const [prefs, setPrefs] = useState(false);
  const [ready, setReady] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as Consent | null;
    if (stored === "essential" || stored === "refused" || stored === "all") {
      setConsent(stored);
    }
    setReady(true);

    const reopen = () => {
      setForced(true);
      setPrefs(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
  }, []);

  function save(next: Consent) {
    window.localStorage.setItem(KEY, next);
    setConsent(next);
    setPrefs(false);
    setForced(false);
  }

  const hidden = !ready || (consent !== "unset" && !forced);
  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/90 p-4 shadow-[0_-20px_60px_oklch(0.08_0.02_240/0.45)] backdrop-blur-xl md:p-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <p id="cookie-title" className="font-medium text-foreground">
            Cookies sur ce site
          </p>
          <p className="text-sm text-muted-foreground">
            TwinFlow n&apos;utilise qu&apos;un cookie essentiel pour mémoriser
            ce choix. Pas d&apos;analytics, pas de publicité, pas de trackers
            tiers. Refuser n&apos;empêche pas de lire la page ni d&apos;ouvrir
            le café local.
          </p>
          {prefs ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Essentiel</strong> —
                préférence de consentement uniquement. Rien d&apos;autre
                n&apos;est déposé.
              </li>
              <li>
                <strong className="text-foreground">Non essentiel</strong> —
                aucun n&apos;est chargé dans ce projet. Accepter n&apos;active
                aucun suivi.
              </li>
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save("refused")}>
            Refuser
          </Button>
          <Button variant="secondary" onClick={() => setPrefs((v) => !v)}>
            Préférences
          </Button>
          <Button onClick={() => save("essential")}>Accepter l&apos;essentiel</Button>
        </div>
      </div>
    </div>
  );
}
