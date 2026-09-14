"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TwinFlowResponse, TwinFlowStatus } from "@/lib/twinflow";

type Product = { id: number; name: string; category: string; price_cents: number };
type Stock = { product_id: number; quantity: number };
type Order = { id: number; product_id: number; quantity: number };

type LastHop = {
  label: string;
  source: string;
  reason: string;
  duration_ms: number;
};

async function readJSON<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `request failed (${res.status})`);
  }
  return data;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function SourceBadge({ source }: { source: string }) {
  const mirror = source === "mirror";
  return (
    <Badge variant={mirror ? "secondary" : "default"}>
      {mirror ? "mirror ~1s" : "central DB"}
    </Badge>
  );
}

export function DemoConsole() {
  const [status, setStatus] = useState<TwinFlowStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productHop, setProductHop] = useState<LastHop | null>(null);
  const [stockHop, setStockHop] = useState<LastHop | null>(null);
  const [writeHop, setWriteHop] = useState<LastHop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [spike, setSpike] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const data = await readJSON<TwinFlowStatus>(await fetch("/api/tf/status"));
    setStatus(data);
  }, []);

  const loadCatalog = useCallback(async () => {
    const res = await readJSON<TwinFlowResponse>(
      await fetch("/api/tf/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "SELECT id, name, category, price_cents FROM products ORDER BY id",
        }),
      }),
    );
    setProducts(
      res.rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        category: String(r.category),
        price_cents: Number(r.price_cents),
      })),
    );
    setProductHop({
      label: "Catalog read",
      source: res.source,
      reason: res.reason,
      duration_ms: res.duration_ms,
    });
  }, []);

  const loadStock = useCallback(async () => {
    const res = await readJSON<TwinFlowResponse>(
      await fetch("/api/tf/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "SELECT product_id, quantity FROM stock ORDER BY product_id",
        }),
      }),
    );
    setStock(
      res.rows.map((r) => ({
        product_id: Number(r.product_id),
        quantity: Number(r.quantity),
      })),
    );
    setStockHop({
      label: "Stock read (fresh)",
      source: res.source,
      reason: res.reason,
      duration_ms: res.duration_ms,
    });
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await readJSON<TwinFlowResponse>(
      await fetch("/api/tf/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "SELECT id, product_id, quantity FROM orders ORDER BY id DESC LIMIT 8",
        }),
      }),
    );
    setOrders(
      res.rows.map((r) => ({
        id: Number(r.id),
        product_id: Number(r.product_id),
        quantity: Number(r.quantity),
      })),
    );
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([refreshStatus(), loadCatalog(), loadStock(), loadOrders()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to reach TwinFlow");
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadOrders, loadStock, refreshStatus]);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [reload, refreshStatus]);

  async function placeOrder(product: Product) {
    setBusy(true);
    setError(null);
    try {
      const write = await readJSON<TwinFlowResponse>(
        await fetch("/api/tf/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: "INSERT INTO orders (product_id, quantity) VALUES ($1, $2)",
            args: [product.id, 1],
          }),
        }),
      );
      setWriteHop({
        label: `Write: order ${product.name}`,
        source: write.source,
        reason: write.reason,
        duration_ms: write.duration_ms,
      });
      const dec = await readJSON<TwinFlowResponse>(
        await fetch("/api/tf/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: "UPDATE stock SET quantity = quantity - 1, updated_at = now() WHERE product_id = $1 AND quantity > 0",
            args: [product.id],
          }),
        }),
      );
      if (dec.rows_affected === 0) {
        setError(`No stock left for ${product.name}.`);
      }
      await Promise.all([loadStock(), loadOrders(), refreshStatus()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "write failed");
    } finally {
      setBusy(false);
    }
  }

  async function runSpike() {
    setBusy(true);
    setSpike(null);
    const started = performance.now();
    try {
      const hops = await Promise.all(
        Array.from({ length: 40 }, async () => {
          const res = await fetch("/api/tf/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sql: "SELECT id, name FROM products",
            }),
          });
          return readJSON<TwinFlowResponse>(res);
        }),
      );
      const mirrors = hops.filter((h) => h.source === "mirror").length;
      setSpike(
        `${hops.length} catalog reads in ${Math.round(performance.now() - started)}ms — ${mirrors} served from the local mirror, ${hops.length - mirrors} fell back to primary.`,
      );
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "spike failed");
    } finally {
      setBusy(false);
    }
  }

  const qty = (id: number) => stock.find((s) => s.product_id === id)?.quantity ?? 0;

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Sidecar or primary unavailable</AlertTitle>
          <AlertDescription>
            {error} Start the stack with <code>docker compose up</code> or run
            TwinFlow locally against Postgres.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Primary"
          value={status?.primary_ok ? "up" : loading ? "…" : "down"}
          hint="source of truth"
        />
        <Stat
          label="Mirror"
          value={status?.mirror_ready ? "ready" : loading ? "…" : "degraded"}
          hint={`lag ${status ? `${status.mirror_lag_ms}ms` : "—"}`}
        />
        <Stat
          label="Write queue"
          value={
            status
              ? `${status.regulator.queue_depth}/${status.regulator.queue_limit}`
              : "…"
          }
          hint={`${status?.regulator.writes_completed ?? 0} writes completed`}
        />
        <Stat
          label="Pool"
          value={
            status ? `${status.pool.acquired}/${status.pool.max_conns}` : "…"
          }
          hint={`${status?.regulator.rate_limit_rps ?? "—"} rps cap`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void reload()} variant="outline" disabled={busy}>
          Refresh
        </Button>
        <Button onClick={() => void runSpike()} disabled={busy || !!error}>
          Simulate catalog spike
        </Button>
        {spike ? <p className="text-sm text-muted-foreground">{spike}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Café catalog</CardTitle>
            <CardDescription>
              Non-critical read — TwinFlow should serve this from the SQLite
              mirror. Place an order to write through the regulator to Postgres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading catalog…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products yet. Seed Postgres with <code>examples/init.sql</code>.
              </p>
            ) : (
              <ul className="divide-y">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.category} · {money(p.price_cents)} · stock {qty(p.id)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={busy || qty(p.id) <= 0}
                      onClick={() => void placeOrder(p)}
                    >
                      Order
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Routing inspector</CardTitle>
              <CardDescription>
                Every response tells you where it ran and why.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[productHop, stockHop, writeHop].filter(Boolean).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Run a read or write to see the hop.
                </p>
              ) : (
                [productHop, stockHop, writeHop].filter(Boolean).map((hop) => (
                  <div key={hop!.label} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{hop!.label}</p>
                      <SourceBadge source={hop!.source} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hop!.reason} · {hop!.duration_ms}ms
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>
                Written to Postgres, then pushed to the mirror.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No orders yet. That is the empty state, not an error.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {orders.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span>#{o.id}</span>
                      <span className="text-muted-foreground">
                        product {o.product_id} × {o.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {status ? (
        <Card>
          <CardHeader>
            <CardTitle>Configured tables</CardTitle>
            <CardDescription>
              <code>fresh: true</code> always reads the central DB. Everyone else
              prefers the mirror until lag or downtime forces a fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 pr-4 font-medium">Reads</th>
                  <th className="py-2 pr-4 font-medium">Fresh</th>
                  <th className="py-2 pr-4 font-medium">Mirror rows</th>
                </tr>
              </thead>
              <tbody>
                {status.tables.map((t) => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono">{t.name}</td>
                    <td className="py-2 pr-4">{t.reads}</td>
                    <td className="py-2 pr-4">{t.fresh ? "yes" : "no"}</td>
                    <td className="py-2 pr-4">{t.mirror_rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
