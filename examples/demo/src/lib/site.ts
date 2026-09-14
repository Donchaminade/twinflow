export const GITHUB_URL = "https://github.com/Donchaminade/twinflow";

export const LANDING_DEMO_VIDEO: string | null = "/demo/twinflow.mp4";

export const OPEN_COOKIE_PREFS_EVENT = "twinflow-open-cookies";

/** Optional public café URL once a hosted sidecar is published. */
export const HOSTED_DEMO_URL =
  process.env.NEXT_PUBLIC_HOSTED_DEMO_URL?.replace(/\/$/, "") || "";
