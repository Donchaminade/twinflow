"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { GITHUB_URL } from "@/lib/site";

const nav = [
  { href: "/#demo", label: "Démo" },
  { href: "/#workflow", label: "Flux" },
  { href: "/#quickstart", label: "5 min" },
  { href: "/#features", label: "Fonctions" },
  { href: "/demo", label: "Café" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background,border-color,backdrop-filter] duration-300 ${
        scrolled || open
          ? "border-border/80 bg-background/75 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="mark" aria-hidden />
          <span className="font-heading text-[0.95rem] font-semibold tracking-tight">
            TwinFlow
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            className="rounded-full border border-border/80 px-3 py-1 text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            GitHub
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
          <span aria-hidden className="relative block h-3.5 w-4">
            <span
              className={`absolute left-0 h-px w-4 bg-foreground transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute top-1.5 left-0 h-px w-4 bg-foreground transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute left-0 h-px w-4 bg-foreground transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-3 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-1 py-2 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a href={GITHUB_URL} className="rounded-lg px-1 py-2">
              Voir sur GitHub
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="flex items-center gap-2 font-heading text-foreground">
            <span className="mark" aria-hidden />
            TwinFlow
          </p>
          <p>
            Sidecar MIT. Postgres reste la source de vérité. Secrets uniquement
            via l&apos;environnement — jamais dans le dépôt.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Conditions
          </Link>
          <Link href="/architecture" className="hover:text-foreground">
            Architecture
          </Link>
          <Link href="/demo" className="hover:text-foreground">
            Café
          </Link>
          <CookieSettingsButton className="hover:text-foreground" />
          <a href={GITHUB_URL} className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
