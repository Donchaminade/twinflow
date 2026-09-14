import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Source_Sans_3 } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const serif = Fraunces({
  variable: "--font-heading",
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
  title: "TwinFlow — database sidecar",
  description:
    "Language-agnostic sidecar that rate-limits writes to your central database and serves non-critical reads from a local mirror synced in about a second.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${serif.variable} ${sans.variable} ${mono.variable} flex min-h-screen flex-col antialiased`}
      >
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
