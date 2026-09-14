"use client";

import { LANDING_DEMO_VIDEO } from "@/lib/site";
import { Reveal } from "@/components/reveal";

export function LandingDemoStage() {
  return (
    <section id="demo" className="relative border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <Reveal>
          <p className="eyebrow">Démo</p>
          <h2 className="font-heading mt-3 max-w-2xl text-3xl tracking-tight md:text-5xl">
            Un pic, un régulateur, deux chemins.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Les lectures catalogue restent sur le miroir. Stock, soldes et
            commandes passent par le primary. Sous charge, la file d&apos;attente
            absorbe — Postgres ne s&apos;ouvre pas en éventail.
          </p>
        </Reveal>

        <Reveal delayMs={80} className="mt-10">
          <figure className="demo-frame">
            <div className="demo-chrome">
              <span className="demo-dot" />
              <span className="demo-dot" />
              <span className="demo-dot" />
              <figcaption className="ml-3 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                TwinFlow · sous charge · boucle 8&nbsp;s
              </figcaption>
            </div>
            {LANDING_DEMO_VIDEO ? (
              <video
                className="aspect-video w-full bg-black"
                controls
                playsInline
                preload="metadata"
                src={LANDING_DEMO_VIDEO}
              >
                Votre navigateur ne lit pas la vidéo. La scène animée ci-dessous
                décrit le même flux.
              </video>
            ) : (
              <LoadDemoAnimation />
            )}
          </figure>
          <p className="mt-4 text-xs text-muted-foreground">
            Pas de lien YouTube factice. Pour une capture réelle, déposez{" "}
            <code className="code-inline">public/demo/twinflow.mp4</code> et
            pointez <code className="code-inline">LANDING_DEMO_VIDEO</code>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function LoadDemoAnimation() {
  return (
    <div className="demo-stage" role="img" aria-label="Animation : un pic de lectures va au miroir, les écritures passent par le régulateur vers Postgres.">
      <svg viewBox="0 0 960 540" className="h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id="tfGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.11 72)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.72 0.08 185)" stopOpacity="0.2" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <path id="pathMirror" d="M 250 268 C 340 268 390 150 548 138" />
          <path id="pathPrimary" d="M 250 292 C 340 292 390 400 548 412" />
          <path id="pathIn" d="M 118 270 C 160 270 190 280 214 280" />
          <path id="pathSync" d="M 700 390 C 760 330 760 200 700 160" />
        </defs>

        <rect width="960" height="540" fill="oklch(0.12 0.02 240)" />
        <circle cx="200" cy="80" r="160" fill="url(#tfGlow)" className="demo-bloom" />

        <g className="demo-clients">
          <NodeBox x={48} y={214} w={120} h={112} label="Clients" sub="HTTP JSON" tone="ink" />
        </g>

        <g filter="url(#soft)">
          <NodeBox x={214} y={196} w={196} h={148} label="TwinFlow" sub="routeur + régulateur" tone="copper" />
        </g>
        <g>
          <text x="232" y="318" className="demo-tiny">
            file
          </text>
          <rect x="262" y="308" width="128" height="10" rx="5" className="demo-track" />
          <rect x="262" y="308" width="128" height="10" rx="5" className="demo-queue" />
        </g>

        <NodeBox x={548} y={78} w={196} h={120} label="Miroir" sub="SQLite · ~1 s" tone="teal" />
        <NodeBox x={548} y={352} w={196} h={120} label="Primary" sub="PostgreSQL" tone="amber" />

        <use href="#pathIn" className="demo-wire" />
        <use href="#pathMirror" className="demo-wire teal" />
        <use href="#pathPrimary" className="demo-wire amber" />
        <use href="#pathSync" className="demo-wire dim" />

        <Packet href="#pathIn" className="pkt ink" delay="0s" dur="1.1s" />
        <Packet href="#pathIn" className="pkt ink" delay="0.55s" dur="1.1s" />
        <Packet href="#pathIn" className="pkt spike" delay="2.1s" dur="0.55s" />
        <Packet href="#pathIn" className="pkt spike" delay="2.35s" dur="0.55s" />
        <Packet href="#pathIn" className="pkt spike" delay="2.6s" dur="0.55s" />

        <Packet href="#pathMirror" className="pkt teal" delay="0.3s" dur="1.5s" />
        <Packet href="#pathMirror" className="pkt teal" delay="1.1s" dur="1.5s" />
        <Packet href="#pathMirror" className="pkt teal spike" delay="2.2s" dur="0.9s" />
        <Packet href="#pathMirror" className="pkt teal spike" delay="2.5s" dur="0.9s" />
        <Packet href="#pathMirror" className="pkt teal spike" delay="2.8s" dur="0.9s" />

        <Packet href="#pathPrimary" className="pkt amber" delay="1.4s" dur="1.8s" />
        <Packet href="#pathPrimary" className="pkt amber" delay="4.2s" dur="1.6s" />

        <circle r="3.5" className="pkt dim">
          <animateMotion dur="8s" repeatCount="indefinite" rotate="auto">
            <mpath href="#pathSync" />
          </animateMotion>
        </circle>

        <text x="48" y="500" className="demo-caption">
          Pic → file du régulateur → lectures miroir · writes / fresh → primary
        </text>
        <text x="700" y="500" className="demo-caption dim">
          sync incrémentale
        </text>
      </svg>
    </div>
  );
}

function NodeBox({
  x,
  y,
  w,
  h,
  label,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  tone: "ink" | "copper" | "teal" | "amber";
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="16" className={`demo-node ${tone}`} />
      <text x={20} y={48} className="demo-label">
        {label}
      </text>
      <text x={20} y={74} className="demo-sub">
        {sub}
      </text>
    </g>
  );
}

function Packet({
  href,
  className,
  delay,
  dur,
}: {
  href: string;
  className: string;
  delay: string;
  dur: string;
}) {
  return (
    <circle r="5" className={className}>
      <animateMotion dur={dur} begin={delay} repeatCount="indefinite">
        <mpath href={href} />
      </animateMotion>
    </circle>
  );
}
