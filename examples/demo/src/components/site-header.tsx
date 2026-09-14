import Link from "next/link";

const links = [
  { href: "/#live", label: "Live demo" },
  { href: "/architecture", label: "Architecture" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-sm font-semibold tracking-tight">
          TwinFlow
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>TwinFlow — MIT licensed sidecar. Central DB stays the source of truth.</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/architecture" className="hover:text-foreground">
            Architecture
          </Link>
        </div>
      </div>
    </footer>
  );
}
