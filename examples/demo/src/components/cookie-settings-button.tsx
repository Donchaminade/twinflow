"use client";

import { OPEN_COOKIE_PREFS_EVENT } from "@/lib/site";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFS_EVENT))}
    >
      Cookies
    </button>
  );
}
