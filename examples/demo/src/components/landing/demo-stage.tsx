"use client";

import { useState } from "react";
import { LANDING_DEMO_VIDEO } from "@/lib/site";
import { Reveal } from "@/components/reveal";
import { LoadDemoSimulator } from "@/components/landing/simulator";

export function LandingDemoStage() {
  const hasVideo = Boolean(LANDING_DEMO_VIDEO);
  const [mode, setMode] = useState<"film" | "sim">(hasVideo ? "film" : "sim");

  return (
    <section id="demo" className="section relative border-y border-border/60">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="eyebrow">Sous charge</p>
          <h2 className="section-title">Un pic, un régulateur, deux chemins.</h2>
          <p className="section-lede">
            Schéma illustratif — <code className="code-inline">accounts</code>,{" "}
            <code className="code-inline">ledger_entries</code>,{" "}
            <code className="code-inline">sessions</code> — pas un métier.
            Les lectures non-fresh restent sur le miroir.{" "}
            <code className="code-inline">fresh</code> et les writes passent
            par le primary. Si le miroir retarde, TwinFlow bascule.
          </p>
        </Reveal>

        <Reveal delayMs={80} className="mt-10">
          {hasVideo ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`sim-tab${mode === "film" ? " is-on" : ""}`}
                onClick={() => setMode("film")}
                aria-pressed={mode === "film"}
              >
                Film
              </button>
              <button
                type="button"
                className={`sim-tab${mode === "sim" ? " is-on" : ""}`}
                onClick={() => setMode("sim")}
                aria-pressed={mode === "sim"}
              >
                Simulateur
              </button>
            </div>
          ) : null}

          <figure className="demo-frame">
            <div className="demo-chrome">
              <span className="demo-dot" />
              <span className="demo-dot" />
              <span className="demo-dot" />
              <figcaption className="ml-3 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                TwinFlow · {mode === "film" ? "simulation 32 s" : "simulateur live"}
              </figcaption>
            </div>
            {hasVideo && mode === "film" ? (
              <video
                className="aspect-video w-full bg-[oklch(0.1_0.02_240)]"
                controls
                playsInline
                autoPlay
                muted
                loop
                preload="metadata"
                src={LANDING_DEMO_VIDEO!}
              >
                <LoadDemoSimulator />
              </video>
            ) : (
              <LoadDemoSimulator />
            )}
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
