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

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 md:pt-28 md:pb-32">
        <p className="eyebrow">Sidecar agnostique · n’importe quel schéma</p>
        <h1 className="font-heading mt-5 max-w-3xl text-[2.4rem] leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-7xl">
          Les pics n&apos;atteignent plus Postgres.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          TwinFlow s&apos;intercale devant PostgreSQL — un binaire, une
          config, n&apos;importe quel langage. Il régule le trafic et sert un
          miroir local synchronisé en ~1&nbsp;s. Les lectures vont au miroir.
          Les tables <code className="code-inline">fresh</code> et toutes les
          écritures vont au primary.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#demo" className="btn-primary">
            Voir la simulation
          </a>
          <a href="#quickstart" className="btn-ghost">
            Démarrer
          </a>
          <a href={GITHUB_URL} className="btn-ghost">
            GitHub
          </a>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border/60 pt-10 sm:grid-cols-4">
          {[
            ["~1 s", "Sync miroir"],
            ["Toujours", "Writes → primary"],
            ["Liste YAML", "Tables fresh"],
            ["HTTP JSON", "Tout langage"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="font-heading mt-1.5 text-xl text-foreground md:text-2xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
