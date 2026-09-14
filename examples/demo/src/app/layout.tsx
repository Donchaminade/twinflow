import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Source_Sans_3 } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TwinFlow — sidecar de régulation Postgres",
    template: "%s — TwinFlow",
  },
  description:
    "Sidecar agnostique qui régule le trafic et sert un miroir local (~1 s) pour que les pics ne tuent pas Postgres. Lectures au miroir ; tables fresh et writes au primary.",
  openGraph: {
    title: "TwinFlow — sidecar de régulation Postgres",
    description:
      "Régule le trafic, sert un miroir local, laisse Postgres comme source de vérité.",
    locale: "fr_TG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${serif.variable} ${sans.variable} ${mono.variable} flex min-h-screen flex-col antialiased`}
      >
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Aller au contenu
        </a>
        <SiteHeader />
        <div id="contenu" tabIndex={-1} className="flex-1">
          {children}
        </div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
