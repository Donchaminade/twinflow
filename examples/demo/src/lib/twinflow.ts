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
  error?: string;
  code?: string;
};

export const SIDECAR_UNREACHABLE_CODE = "sidecar_unreachable";

const DEFAULT_URL = "http://127.0.0.1:8741";
const SIDECAR_TIMEOUT_MS = 8_000;

const KNOWN_ERRORS: Record<string, string> = {
  [SIDECAR_UNREACHABLE_CODE]:
    "Le sidecar TwinFlow n’est pas joignable pour le moment.",
  "invalid json": "Requête invalide.",
  unauthorized: "Accès refusé.",
  "write queue full; retry later":
    "La file d’écriture est pleine. Réessayez dans un instant.",
  "regulator timeout": "Le régulateur a expiré. Réessayez.",
};

export function sidecarUnavailableBody(): TwinFlowError {
  return {
    code: SIDECAR_UNREACHABLE_CODE,
    error: KNOWN_ERRORS[SIDECAR_UNREACHABLE_CODE],
  };
}

export function isSidecarUnreachable(err: unknown): boolean {
  return err instanceof TwinFlowRequestError && err.offline;
}

export class TwinFlowRequestError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly offline: boolean;

  constructor(message: string, opts: { code?: string; status: number }) {
    super(message);
    this.name = "TwinFlowRequestError";
    this.code = opts.code;
    this.status = opts.status;
    this.offline =
      opts.code === SIDECAR_UNREACHABLE_CODE ||
      opts.status === 502 ||
      opts.status === 504;
  }
}

export function formatTwinFlowError(
  payload: TwinFlowError,
  status?: number,
): string {
  if (payload.code && KNOWN_ERRORS[payload.code]) {
    return KNOWN_ERRORS[payload.code];
  }
  const raw = (payload.error || "").trim();
  if (raw && KNOWN_ERRORS[raw]) {
    return KNOWN_ERRORS[raw];
  }
  if (raw && !/TWINFLOW_[A-Z0-9_]+/.test(raw)) {
    return raw;
  }
  if (status && status >= 500) {
    return KNOWN_ERRORS[SIDECAR_UNREACHABLE_CODE];
  }
  return "La requête a échoué. Réessayez.";
}

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

  const parent = init?.signal;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SIDECAR_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (parent) {
    if (parent.aborted) {
      ctrl.abort();
    } else {
      parent.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    return await fetch(`${sidecarURL()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onAbort);
  }
}
