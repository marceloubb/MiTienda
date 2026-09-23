"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Flag,
  Loader2,
  PackageOpen,
  RotateCcw,
  Warehouse,
  X,
} from "lucide-react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth-context";
import {
  advanceOrder,
  flagDiscrepancy,
  getStaffOrders,
  type DiscrepancyReason,
  type Order,
  type OrderStatus,
} from "@/lib/api";
import { OrderStatusBadge, STATUS_FALLBACK_LABELS } from "@/lib/order-status";
import InventoryView from "@/components/admin/InventoryView";
import RequireRole from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Cola de preparación (roles bodega/admin): pendiente → procesando → listo
// para despacho. Los pedidos marcados con discrepancia quedan bloqueados
// hasta que un administrador los resuelva o cancele. El guard es UX-only;
// el backend valida cada transición según su ADVANCE_MATRIX.
const QUEUE_STATUSES: OrderStatus[] = ["pending", "processing", "ready", "discrepancy"];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "processing",
  processing: "ready",
};

const FLAGGABLE_STATUSES: OrderStatus[] = ["pending", "processing", "ready"];

const REASON_LABELS: Record<string, string> = {
  missing: "Falta mercadería",
  damaged: "Mercadería dañada",
};

function formatPrice(value: string): string {
  return `$${parseFloat(value).toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BodegaPage() {
  return (
    <RequireRole roles={["bodega", "admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <Warehouse className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Bodega
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Inventario y cola de preparación de pedidos: de pendiente a listo para despacho.
        </p>
        <div className="mt-6">
          <BodegaQueue />
        </div>
        <div className="mt-6">
          <InventoryView />
        </div>
      </div>
    </RequireRole>
  );
}

function BodegaQueue() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [flaggingId, setFlaggingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;

    getStaffOrders(token)
      .then((data) => {
        if (!cancelled) {
          setOrders(data.filter((order) => QUEUE_STATUSES.includes(order.status)));
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "No se pudieron cargar los pedidos. Comprueba que el backend esté ejecutándose."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  async function handleAdvance(order: Order) {
    if (!token) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setPendingIds((ids) => new Set(ids).add(order.id));
    try {
      const updated = await advanceOrder(token, order.id, next);
      sileo.success({
        title: "Pedido avanzado",
        description: `El pedido #${updated.id} pasó a "${updated.status_display}".`,
      });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo avanzar el pedido.";
      sileo.error({ title: "No se pudo avanzar el pedido", description: message });
    } finally {
      setPendingIds((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(order.id);
        return nextIds;
      });
    }
  }

  async function handleFlag(order: Order, reason: DiscrepancyReason) {
    if (!token) return;

    setPendingIds((ids) => new Set(ids).add(order.id));
    try {
      const updated = await flagDiscrepancy(token, order.id, reason);
      sileo.success({
        title: "Discrepancia marcada",
        description: `El pedido #${updated.id} quedó bloqueado por "${REASON_LABELS[reason].toLowerCase()}".`,
      });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo marcar la discrepancia.";
      sileo.error({ title: "No se pudo marcar la discrepancia", description: message });
    } finally {
      setFlaggingId(null);
      setPendingIds((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(order.id);
        return nextIds;
      });
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" aria-hidden="true" />
          <Skeleton className="h-4 w-40" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" aria-hidden="true" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RotateCcw />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const discrepancyCount = orders.filter((order) => order.status === "discrepancy").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cola de preparación</CardTitle>
        <CardDescription>
          {orders.length} pedido{orders.length === 1 ? "" : "s"} · {discrepancyCount} con
          discrepancia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <PackageOpen className="size-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No hay pedidos pendientes de preparación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2.5 pr-3 font-medium text-foreground">#{order.id}</td>
                    <td className="py-2.5 pr-3 text-foreground">
                      {order.shipping_name || "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <OrderStatusBadge status={order.status} display={order.status_display} />
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-2.5">
                      <QueueActions
                        order={order}
                        isPending={pendingIds.has(order.id)}
                        isFlagging={flaggingId === order.id}
                        onAdvance={handleAdvance}
                        onToggleFlag={() =>
                          setFlaggingId((id) => (id === order.id ? null : order.id))
                        }
                        onFlag={handleFlag}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QueueActions({
  order,
  isPending,
  isFlagging,
  onAdvance,
  onToggleFlag,
  onFlag,
}: {
  order: Order;
  isPending: boolean;
  isFlagging: boolean;
  onAdvance: (order: Order) => void;
  onToggleFlag: () => void;
  onFlag: (order: Order, reason: DiscrepancyReason) => void;
}) {
  if (order.status === "discrepancy") {
    return (
      <span className="text-xs text-muted-foreground">
        {REASON_LABELS[order.discrepancy_reason ?? ""] ??
          order.discrepancy_reason ??
          "Bloqueado por discrepancia"}
      </span>
    );
  }

  const next = NEXT_STATUS[order.status];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {next && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => onAdvance(order)}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Avanzar a {STATUS_FALLBACK_LABELS[next] ?? next}
        </Button>
      )}
      {FLAGGABLE_STATUSES.includes(order.status) &&
        (isFlagging ? (
          <>
            <span className="text-xs text-muted-foreground">Motivo:</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onFlag(order, "missing")}
            >
              Falta mercadería
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onFlag(order, "damaged")}
            >
              Mercadería dañada
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={onToggleFlag}
              aria-label="Cancelar marcado de discrepancia"
            >
              <X />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={isPending} onClick={onToggleFlag}>
            <Flag />
            Marcar discrepancia
          </Button>
        ))}
    </div>
  );
}