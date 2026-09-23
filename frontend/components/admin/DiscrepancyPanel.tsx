"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { sileo } from "sileo";
import { cancelOrder, getStaffOrders, resolveDiscrepancy, type Order } from "@/lib/api";
import { OrderStatusBadge } from "@/lib/order-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Muestra los pedidos bloqueados (status "discrepancy") con su motivo y las
// acciones de resolución (solo admin) o cancelación.
const REASON_LABELS: Record<string, string> = {
  missing: "Falta mercadería",
  damaged: "Mercadería dañada",
};

export default function DiscrepancyPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    getStaffOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data.filter((order) => order.status === "discrepancy"));
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudieron cargar las discrepancias.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  function runAction(order: Order, action: () => Promise<Order>, successTitle: string) {
    setPendingIds((ids) => new Set(ids).add(order.id));
    action()
      .then((updated) => {
        sileo.success({
          title: successTitle,
          description: `El pedido #${updated.id} pasó a "${updated.status_display}".`,
        });
        refresh();
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "No se pudo completar la operación.";
        sileo.error({ title: successTitle, description: message });
      })
      .finally(() => {
        setPendingIds((ids) => {
          const nextIds = new Set(ids);
          nextIds.delete(order.id);
          return nextIds;
        });
      });
  }

  function handleResolve(order: Order) {
    runAction(order, () => resolveDiscrepancy(order.id), "Discrepancia resuelta");
  }

  function handleCancel(order: Order) {
    runAction(order, () => cancelOrder(order.id), "Pedido cancelado");
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-52" aria-hidden="true" />
          <Skeleton className="h-4 w-36" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" aria-hidden="true" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          Discrepancias pendientes
        </CardTitle>
        <CardDescription>
          Pedidos bloqueados por falta o daño de mercadería hasta que un
          administrador los resuelva o cancele.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RotateCcw />
              Reintentar
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-stock" />
            No hay pedidos con discrepancia.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">Pedido #{order.id}</span>
                    <OrderStatusBadge status={order.status} display={order.status_display} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.customer || order.shipping_name || "—"} · Total $
                    {parseFloat(order.total).toFixed(2)}
                  </p>
                  <p className="mt-1 inline-block rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    {REASON_LABELS[order.discrepancy_reason ?? ""] ??
                      order.discrepancy_reason ??
                      "Sin motivo"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pendingIds.has(order.id)}
                    onClick={() => handleResolve(order)}
                  >
                    {pendingIds.has(order.id) && <Loader2 className="animate-spin" />}
                    Resolver
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pendingIds.has(order.id)}
                    onClick={() => handleCancel(order)}
                  >
                    {pendingIds.has(order.id) && <Loader2 className="animate-spin" />}
                    <Ban />
                    Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}