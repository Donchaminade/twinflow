export const SIM_DURATION_S = 32;
export const SIM_RPS_CAP = 50;
export const SIM_QUEUE_LIMIT = 32;

export type HopDest = "mirror" | "primary";
export type SimPhase =
  | "idle"
  | "spike"
  | "writes"
  | "sync"
  | "lag"
  | "failover"
  | "recover";

export type SimHop = {
  id: string;
  sql: string;
  dest: HopDest;
  kind: "read" | "write";
  reason: string;
};

export type SimTable = {
  name: string;
  fresh: boolean;
  dest: HopDest;
};

export type SimState = {
  t: number;
  phase: SimPhase;
  title: string;
  caption: string;
  rps: number;
  rpsCap: number;
  queueDepth: number;
  queueLimit: number;
  traffic: number;
  mirrorLagMs: number;
  mirrorReady: boolean;
  failover: boolean;
  hops: SimHop[];
  tables: SimTable[];
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, x: number) {
  return a + (b - a) * clamp(x, 0, 1);
}

function phaseOf(t: number): {
  phase: SimPhase;
  title: string;
  caption: string;
} {
  if (t < 4) {
    return {
      phase: "idle",
      title: "Trafic nominal",
      caption:
        "Lectures non critiques → miroir. Tables fresh et writes → primary.",
    };
  }
  if (t < 10) {
    return {
      phase: "spike",
      title: "Pic de lectures",
      caption:
        "Le pic tape le miroir. Postgres n’ouvre pas une session par requête.",
    };
  }
  if (t < 16) {
    return {
      phase: "writes",
      title: "Writes en file",
      caption:
        "Le régulateur borne le débit. File pleine : 429, pas un nouveau pool.",
    };
  }
  if (t < 21) {
    return {
      phase: "sync",
      title: "Sync incrémentale",
      caption:
        "Le miroir rattrape les tables configurées — environ une seconde.",
    };
  }
  if (t < 24) {
    return {
      phase: "lag",
      title: "Miroir en retard",
      caption: "Le lag approche le seuil. TwinFlow se prépare à basculer.",
    };
  }
  if (t < 28) {
    return {
      phase: "failover",
      title: "Basculer vers le primary",
      caption:
        "Lag au-delà du seuil : les lectures rejoignent Postgres le temps du rattrapage.",
    };
  }
  return {
    phase: "recover",
    title: "Retour au miroir",
    caption: "Le miroir est à jour. Les lectures non-fresh y reviennent.",
  };
}

function hopsFor(phase: SimPhase, failover: boolean): SimHop[] {
  const mirror: HopDest = failover ? "primary" : "mirror";
  const mirrorReason = failover
    ? "failover · lag > max_lag"
    : "lecture · miroir";
  switch (phase) {
    case "idle":
      return [
        {
          id: "a",
          sql: "SELECT id, email FROM accounts",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
        {
          id: "s",
          sql: "SELECT token FROM sessions",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
        {
          id: "l",
          sql: "SELECT amount FROM ledger_entries",
          dest: "primary",
          kind: "read",
          reason: "fresh: true",
        },
      ];
    case "spike":
      return [
        {
          id: "a1",
          sql: "SELECT * FROM accounts WHERE active",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
        {
          id: "a2",
          sql: "SELECT * FROM sessions LIMIT 50",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
        {
          id: "a3",
          sql: "SELECT id FROM accounts",
          dest: mirror,
          kind: "read",
          reason: "pic · miroir",
        },
        {
          id: "l",
          sql: "SELECT * FROM ledger_entries",
          dest: "primary",
          kind: "read",
          reason: "fresh: true",
        },
      ];
    case "writes":
      return [
        {
          id: "w1",
          sql: "INSERT INTO ledger_entries …",
          dest: "primary",
          kind: "write",
          reason: "write · toujours primary",
        },
        {
          id: "w2",
          sql: "UPDATE accounts SET …",
          dest: "primary",
          kind: "write",
          reason: "write · file du régulateur",
        },
        {
          id: "a",
          sql: "SELECT id FROM accounts",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
      ];
    case "sync":
      return [
        {
          id: "sy",
          sql: "sync accounts, sessions, ledger_entries",
          dest: "mirror",
          kind: "read",
          reason: "tick incrémental ~1 s",
        },
        {
          id: "a",
          sql: "SELECT email FROM accounts",
          dest: mirror,
          kind: "read",
          reason: mirrorReason,
        },
      ];
    case "lag":
    case "failover":
      return [
        {
          id: "a",
          sql: "SELECT id FROM accounts",
          dest: "primary",
          kind: "read",
          reason: "failover · lag > max_lag",
        },
        {
          id: "s",
          sql: "SELECT token FROM sessions",
          dest: "primary",
          kind: "read",
          reason: "failover · miroir en retard",
        },
        {
          id: "l",
          sql: "SELECT amount FROM ledger_entries",
          dest: "primary",
          kind: "read",
          reason: "fresh: true",
        },
      ];
    default:
      return [
        {
          id: "a",
          sql: "SELECT id, email FROM accounts",
          dest: "mirror",
          kind: "read",
          reason: "lecture · miroir",
        },
        {
          id: "s",
          sql: "SELECT token FROM sessions",
          dest: "mirror",
          kind: "read",
          reason: "lecture · miroir",
        },
        {
          id: "l",
          sql: "SELECT amount FROM ledger_entries",
          dest: "primary",
          kind: "read",
          reason: "fresh: true",
        },
      ];
  }
}

export function simStateAt(tRaw: number): SimState {
  const t = ((tRaw % SIM_DURATION_S) + SIM_DURATION_S) % SIM_DURATION_S;
  const meta = phaseOf(t);

  let traffic = 0.18;
  let rps = 8;
  let queueDepth = 2;
  let mirrorLagMs = 240;
  let failover = false;

  if (t < 4) {
    const x = t / 4;
    traffic = lerp(0.12, 0.22, x);
    rps = lerp(6, 11, x);
    queueDepth = 2;
    mirrorLagMs = lerp(180, 320, x);
  } else if (t < 10) {
    const x = (t - 4) / 6;
    traffic = lerp(0.22, 0.94, x);
    rps = lerp(11, 46, x);
    queueDepth = lerp(2, 8, x);
    mirrorLagMs = lerp(320, 780, x);
  } else if (t < 16) {
    const x = (t - 10) / 6;
    traffic = lerp(0.94, 0.72, x);
    rps = lerp(46, SIM_RPS_CAP, x);
    queueDepth = lerp(8, 29, x);
    mirrorLagMs = lerp(780, 1100, x);
  } else if (t < 21) {
    const x = (t - 16) / 5;
    traffic = lerp(0.72, 0.48, x);
    rps = lerp(SIM_RPS_CAP, 28, x);
    queueDepth = lerp(29, 14, x);
    mirrorLagMs = lerp(1100, 980, x);
  } else if (t < 24) {
    const x = (t - 21) / 3;
    traffic = lerp(0.48, 0.55, x);
    rps = lerp(28, 24, x);
    queueDepth = lerp(14, 10, x);
    mirrorLagMs = lerp(980, 3400, x);
  } else if (t < 28) {
    const x = (t - 24) / 4;
    failover = true;
    traffic = lerp(0.55, 0.4, x);
    rps = lerp(24, 18, x);
    queueDepth = lerp(10, 6, x);
    mirrorLagMs = lerp(3400, 4100, x);
  } else {
    const x = (t - 28) / 4;
    traffic = lerp(0.4, 0.16, x);
    rps = lerp(18, 8, x);
    queueDepth = lerp(6, 2, x);
    mirrorLagMs = lerp(1800, 220, x);
  }

  const tables: SimTable[] = [
    {
      name: "accounts",
      fresh: false,
      dest: failover ? "primary" : "mirror",
    },
    { name: "ledger_entries", fresh: true, dest: "primary" },
    {
      name: "sessions",
      fresh: false,
      dest: failover ? "primary" : "mirror",
    },
  ];

  return {
    t,
    phase: meta.phase,
    title: meta.title,
    caption: meta.caption,
    rps: Math.round(rps),
    rpsCap: SIM_RPS_CAP,
    queueDepth: Math.round(queueDepth),
    queueLimit: SIM_QUEUE_LIMIT,
    traffic: clamp(traffic, 0, 1),
    mirrorLagMs: Math.round(mirrorLagMs),
    mirrorReady: !failover && mirrorLagMs < 3000,
    failover,
    hops: hopsFor(meta.phase, failover),
    tables,
  };
}
