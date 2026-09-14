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
import { SidecarOfflinePanel } from "@/components/sidecar-offline";
import {
  formatTwinFlowError,
  isSidecarUnreachable,
  TwinFlowRequestError,
  type TwinFlowResponse,
  type TwinFlowStatus,
} from "@/lib/twinflow";

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
  const data = (await res.json()) as T & { error?: string; code?: string };
  if (!res.ok) {
    throw new TwinFlowRequestError(formatTwinFlowError(data, res.status), {
      code: data.code,
      status: res.status,
    });
  }
  return data;
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2)}\u00a0$`;
}

function SourceBadge({ source }: { source: string }) {
  const mirror = source === "mirror";
  return (
    <Badge variant={mirror ? "secondary" : "default"}>
      {mirror ? "miroir ~1s" : "base centrale"}
    </Badge>
  );
}

function catchMessage(err: unknown, fallback: string) {
  if (err instanceof TwinFlowRequestError) {
    return err.message;
  }
  if (err instanceof Error && err.message && !/TWINFLOW_[A-Z0-9_]+/.test(err.message)) {
    return err.message;
  }
  return fallback;
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
  const [offline, setOffline] = useState(false);
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
      label: "Lecture catalogue (exemple)",
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
      label: "Lecture stock (fresh, exemple)",
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
      setOffline(false);
    } catch (err) {
      if (isSidecarUnreachable(err)) {
        setOffline(true);
        setError(null);
      } else {
        setError(catchMessage(err, "Impossible de joindre TwinFlow."));
      }
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadOrders, loadStock, refreshStatus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (offline) return;
    const id = window.setInterval(() => {
      void refreshStatus().catch((err) => {
        if (isSidecarUnreachable(err)) {
          setOffline(true);
        }
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, [offline, refreshStatus]);

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
        label: `Écriture : commande ${product.name}`,
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
        setError(`Plus de stock pour ${product.name}.`);
      }
      await Promise.all([loadStock(), loadOrders(), refreshStatus()]);
    } catch (err) {
      if (isSidecarUnreachable(err)) {
        setOffline(true);
        setError(null);
      } else {
        setError(catchMessage(err, "L’écriture a échoué."));
      }
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
        `${hops.length} lectures catalogue (exemple) en ${Math.round(performance.now() - started)} ms — ${mirrors} servies depuis le miroir, ${hops.length - mirrors} basculées au primary.`,
      );
      await refreshStatus();
    } catch (err) {
      if (isSidecarUnreachable(err)) {
        setOffline(true);
        setError(null);
      } else {
        setError(catchMessage(err, "La simulation de pic a échoué."));
      }
    } finally {
      setBusy(false);
    }
  }

  const qty = (id: number) => stock.find((s) => s.product_id === id)?.quantity ?? 0;

  if (offline && !status) {
    return (
      <SidecarOfflinePanel onRetry={() => void reload()} busy={loading || busy} />
    );
  }

  return (
    <div className="space-y-6">
      {offline ? (
        <SidecarOfflinePanel onRetry={() => void reload()} busy={loading || busy} />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>La démo n’a pas pu terminer cette action</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Primary"
          value={status?.primary_ok ? "en ligne" : loading ? "…" : "hors ligne"}
          hint="source de vérité"
        />
        <Stat
          label="Miroir"
          value={status?.mirror_ready ? "prêt" : loading ? "…" : "dégradé"}
          hint={`lag ${status ? `${status.mirror_lag_ms} ms` : "—"}`}
        />
        <Stat
          label="File d’écriture"
          value={
            status
              ? `${status.regulator.queue_depth}/${status.regulator.queue_limit}`
              : "…"
          }
          hint={`${status?.regulator.writes_completed ?? 0} écritures terminées`}
        />
        <Stat
          label="Pool"
          value={
            status ? `${status.pool.acquired}/${status.pool.max_conns}` : "…"
          }
          hint={`plafond ${status?.regulator.rate_limit_rps ?? "—"} req/s`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void reload()} variant="outline" disabled={busy}>
          Actualiser
        </Button>
        <Button onClick={() => void runSpike()} disabled={busy || offline}>
          Simuler un pic catalogue
        </Button>
        {spike ? <p className="text-sm text-muted-foreground">{spike}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Catalogue (exemple café)</CardTitle>
            <CardDescription>
              Lecture non critique — TwinFlow doit servir ceci depuis le miroir
              SQLite. Passer commande écrit via le régulateur vers Postgres.
              Ceci n&apos;est qu&apos;un schéma illustratif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Chargement du catalogue…
              </p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun produit pour l’instant. En local, le schéma d’exemple se
                charge avec l’initialisation Postgres de la stack.
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
                      disabled={busy || offline || qty(p.id) <= 0}
                      onClick={() => void placeOrder(p)}
                    >
                      Commander
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
            <CardTitle>Inspecteur de routage</CardTitle>
            <CardDescription>
                Chaque réponse indique où elle a tourné, et pourquoi.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[productHop, stockHop, writeHop].filter(Boolean).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Lancez une lecture ou une écriture pour voir le hop.
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
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>
                Écrites sur Postgres, puis poussées au miroir.
            </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune commande. C’est l’état vide, pas une erreur.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {orders.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span>#{o.id}</span>
                      <span className="text-muted-foreground">
                        produit {o.product_id} × {o.quantity}
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
            <CardTitle>Tables configurées</CardTitle>
            <CardDescription>
              <code>fresh: true</code> lit toujours la base centrale. Les
              autres préfèrent le miroir jusqu&apos;à un lag ou une panne.
              Liste de config — pas un métier figé.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Table</th>
                  <th className="py-2 pr-4 font-medium">Lectures</th>
                  <th className="py-2 pr-4 font-medium">Fresh</th>
                  <th className="py-2 pr-4 font-medium">Lignes miroir</th>
                </tr>
              </thead>
              <tbody>
                {status.tables.map((t) => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono">{t.name}</td>
                    <td className="py-2 pr-4">{t.reads}</td>
                    <td className="py-2 pr-4">{t.fresh ? "oui" : "non"}</td>
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
