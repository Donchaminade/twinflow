import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — TwinFlow" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 14 September 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7">
        <p>
          TwinFlow is a local sidecar and this site is a developer demo. We
          collect as little as possible. The sidecar never logs SQL arguments,
          row bodies, passwords, or tokens.
        </p>
        <h2 className="font-heading text-2xl">What this demo stores</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            An optional consent preference in your browser (
            <code>twinflow-cookie-consent</code>). That is the only cookie.
          </li>
          <li>
            Café orders you place in the live demo, stored in the local Docker
            Postgres that you run. That data never leaves your machine.
          </li>
        </ul>
        <h2 className="font-heading text-2xl">What we do not do</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>No analytics, advertising, or social pixels.</li>
          <li>No sale of personal data. There is none to sell.</li>
          <li>No accounts, no mailing list, no third-party processors on this demo.</li>
        </ul>
        <h2 className="font-heading text-2xl">When you self-host TwinFlow</h2>
        <p>
          You are the controller of the database TwinFlow proxies. Point the
          sidecar at a least-privilege role, keep credentials in the
          environment, and do not expose <code>/v1/*</code> to the public
          internet without authentication.
        </p>
        <h2 className="font-heading text-2xl">Contact</h2>
        <p>
          For a privacy question about this project, open an issue on the
          TwinFlow repository. Do not attach dumps or credentials.
        </p>
      </div>
    </main>
  );
}
