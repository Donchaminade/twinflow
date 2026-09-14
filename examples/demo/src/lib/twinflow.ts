export type TwinFlowRow = Record<string, unknown>;

export type TwinFlowResponse = {
  columns: string[];
  rows: TwinFlowRow[];
  rows_affected: number;
  source: "mirror" | "primary";
  reason: string;
  kind: string;
  tables: string[];
  mirror_lag_ms: number;
  duration_ms: number;
  invalidated?: string[];
};

export type TwinFlowStatus = {
  service: string;
  version: string;
  uptime_s: number;
  primary_ok: boolean;
  mirror_ready: boolean;
  mirror_lag_ms: number;
  mirror_error?: string;
  last_sync: string;
  pool: { acquired: number; idle: number; max_conns: number };
  regulator: {
    queue_depth: number;
    queue_limit: number;
    queue_dropped: number;
    writes_admitted: number;
    writes_completed: number;
    rate_limit_rps: number;
  };
  tables: {
    name: string;
    fresh: boolean;
    sync: boolean;
    reads: string;
    watermark?: string;
    mirror_rows: number;
  }[];
  rules: string[];
};

export type TwinFlowError = {
  error: string;
};

const DEFAULT_URL = "http://127.0.0.1:8741";

export function sidecarURL(): string {
  return (process.env.TWINFLOW_URL || DEFAULT_URL).replace(/\/$/, "");
}

export async function sidecarFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = process.env.TWINFLOW_API_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${sidecarURL()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
