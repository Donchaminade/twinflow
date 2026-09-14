"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Consent = "unset" | "essential" | "refused" | "all";

const KEY = "twinflow-cookie-consent";

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>("unset");
  const [prefs, setPrefs] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as Consent | null;
    if (stored === "essential" || stored === "refused" || stored === "all") {
      setConsent(stored);
    }
    setReady(true);
  }, []);

  function save(next: Consent) {
    window.localStorage.setItem(KEY, next);
    setConsent(next);
    setPrefs(false);
  }

  if (!ready || consent !== "unset") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 p-4 shadow-lg backdrop-blur md:p-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <p id="cookie-title" className="font-medium">
            Cookies on this demo
          </p>
          <p className="text-sm text-muted-foreground">
            TwinFlow uses one essential cookie to remember this choice. There are
            no analytics, ads, or third-party trackers. Refusing still lets you
            use the demo.
          </p>
          {prefs ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Essential</strong> — consent
                preference only. Always off unless you accept.
              </li>
              <li>
                <strong className="text-foreground">Non-essential</strong> —
                none are loaded in this project. Accepting does not enable
                tracking.
              </li>
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save("refused")}>
            Refuse
          </Button>
          <Button variant="secondary" onClick={() => setPrefs((v) => !v)}>
            Preferences
          </Button>
          <Button onClick={() => save("essential")}>Accept essential</Button>
        </div>
      </div>
    </div>
  );
}
