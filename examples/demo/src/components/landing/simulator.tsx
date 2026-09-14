"use client";

import { useEffect, useRef, useState } from "react";
import { SIM_DURATION_S, simStateAt, type SimState } from "@/lib/simulation";

export function LoadDemoSimulator() {
  const [playing, setPlaying] = useState(true);
  const [state, setState] = useState<SimState>(() => simStateAt(0));
  const tRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPlaying(false);
      setState(simStateAt(12));
      return;
    }

    let frame = 0;
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      tRef.current = (tRef.current + dt) % SIM_DURATION_S;
      setState(simStateAt(tRef.current));
      frame = window.requestAnimationFrame(tick);
    };

    if (!playing) {
      lastRef.current = null;
      return;
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  function restart() {
    tRef.current = 0;
    lastRef.current = null;
    setState(simStateAt(0));
    setPlaying(true);
  }

  return (
    <div
      className="sim"
      role="img"
      aria-label={`${state.title}. ${state.caption}`}
    >
      <SimDashboard state={state} />
      <div className="sim-controls">
        <button type="button" className="sim-btn" onClick={() => setPlaying((v) => !v)}>
          {playing ? "Pause" : "Lecture"}
        </button>
        <button type="button" className="sim-btn" onClick={restart}>
          Relancer
        </button>
        <span className="sim-clock">
          {String(Math.floor(state.t)).padStart(2, "0")}s / {SIM_DURATION_S}s
        </span>
        <span className="sim-phase">{state.title}</span>
      </div>
    </div>
  );
}

export function SimDashboard({ state }: { state: SimState }) {
  return (
    <div className="sim-board">
      <header className="sim-top">
        <div>
          <p className="sim-kicker">TwinFlow · schéma générique</p>
          <p className="sim-tables">
            accounts · ledger_entries · sessions
          </p>
        </div>
        <div className="sim-badges">
          <span className={`sim-badge ${state.mirrorReady ? "ok" : "warn"}`}>
            sync ~1 s
          </span>
          {state.failover ? (
            <span className="sim-badge alert">failover</span>
          ) : (
            <span className="sim-badge teal">miroir prêt</span>
          )}
        </div>
      </header>

      <div className="sim-gauges">
        <Gauge
          label="Pic de trafic"
          value={`${Math.round(state.traffic * 100)}%`}
          ratio={state.traffic}
          tone="copper"
        />
        <Gauge
          label="File d’écriture"
          value={`${state.queueDepth}/${state.queueLimit}`}
          ratio={state.queueDepth / state.queueLimit}
          tone="amber"
        />
        <Gauge
          label="Rate-limit primary"
          value={`${state.rps}/${state.rpsCap} rps`}
          ratio={state.rps / state.rpsCap}
          tone="teal"
        />
      </div>

      <div className="sim-flow">
        <FlowNode title="App" sub="HTTP JSON" tone="ink" />
        <span className="sim-arrow" aria-hidden>
          →
        </span>
        <FlowNode title="TwinFlow" sub="routeur + file" tone="copper" />
        <span className="sim-arrow" aria-hidden>
          →
        </span>
        <div className="sim-split">
          <FlowNode
            title="Miroir"
            sub={`SQLite · lag ${state.mirrorLagMs} ms`}
            tone="teal"
            dim={state.failover}
          />
          <FlowNode title="Primary" sub="PostgreSQL" tone="amber" />
        </div>
      </div>

      <div className="sim-bottom">
        <ul className="sim-hops">
          {state.hops.map((hop) => (
            <li key={hop.id}>
              <code>{hop.sql}</code>
              <span className={`sim-dest ${hop.dest}`}>
                {hop.dest === "mirror" ? "miroir" : "primary"}
              </span>
              <em>{hop.reason}</em>
            </li>
          ))}
        </ul>
        <ul className="sim-schema">
          {state.tables.map((table) => (
            <li key={table.name}>
              <code>{table.name}</code>
              <span>{table.fresh ? "fresh" : "sync"}</span>
              <span className={`sim-dest ${table.dest}`}>
                {table.dest === "mirror" ? "miroir" : "primary"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="sim-caption">{state.caption}</p>
    </div>
  );
}

function Gauge({
  label,
  value,
  ratio,
  tone,
}: {
  label: string;
  value: string;
  ratio: number;
  tone: "copper" | "teal" | "amber";
}) {
  return (
    <div className={`sim-gauge ${tone}`}>
      <div className="sim-gauge-meta">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="sim-track">
        <div className="sim-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function FlowNode({
  title,
  sub,
  tone,
  dim,
}: {
  title: string;
  sub: string;
  tone: "ink" | "copper" | "teal" | "amber";
  dim?: boolean;
}) {
  return (
    <div className={`sim-node ${tone}${dim ? " dim" : ""}`}>
      <strong>{title}</strong>
      <span>{sub}</span>
    </div>
  );
}
