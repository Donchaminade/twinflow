import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use — TwinFlow" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 14 September 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7">
        <p>
          TwinFlow is released under the MIT License. The software is provided
          &quot;as is&quot;, without warranty of any kind. See the LICENSE file
          in the repository.
        </p>
        <h2 className="font-heading text-2xl">This demo</h2>
        <p>
          The café on the homepage is a local demonstration. It is not a
          production payment, inventory, or ordering system. Do not enter real
          personal or payment data.
        </p>
        <h2 className="font-heading text-2xl">Your responsibilities</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Keep database credentials out of git and out of container images.</li>
          <li>Size the regulator so a buggy client cannot flood Postgres.</li>
          <li>
            Treat the sidecar process as equivalent to the database role it
            uses.
          </li>
        </ul>
        <h2 className="font-heading text-2xl">Acceptable use</h2>
        <p>
          Do not use TwinFlow to conceal unauthorized access, to bypass access
          controls you do not own, or to process data you are not allowed to
          store.
        </p>
      </div>
    </main>
  );
}
