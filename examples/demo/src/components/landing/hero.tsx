"use client";

import { useEffect, useRef } from "react";
import { GITHUB_URL } from "@/lib/site";

export function LandingHero() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const onScroll = () => {
      const y = Math.min(window.scrollY, 480);
      el.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div ref={layer} className="pointer-events-none absolute inset-0 -z-10">
        <div className="landing-aurora" />
        <div className="landing-grid" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="eyebrow">Sidecar agnostique · Postgres v1</p>
        <h1 className="font-heading mt-5 max-w-3xl text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-7xl">
          Les pics n&apos;atteignent plus Postgres.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          TwinFlow s&apos;intercale devant PostgreSQL&nbsp;: il régule le
          trafic et sert un miroir local synchronisé en ~1&nbsp;s. Les lectures
          vont au miroir. Les tables <code className="code-inline">fresh</code>{" "}
          et toutes les écritures vont au primary.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#quickstart" className="btn-primary">
            Démarrer
          </a>
          <a href={GITHUB_URL} className="btn-ghost">
            Voir sur GitHub
          </a>
          <a href="#quickstart" className="btn-ghost">
            Quickstart
          </a>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-4 border-t border-border/60 pt-8 sm:grid-cols-4">
          {[
            ["~1 s", "Sync miroir"],
            ["Toujours", "Writes → primary"],
            ["MIT", "Open source"],
            ["HTTP JSON", "N’importe quel langage"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="font-heading mt-1 text-xl text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
