"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Flag,
  Loader2,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import { sileo } from "sileo";
import {
  advanceOrder,
  cancelOrder,
  getStaffOrders,
  type Order,
  type OrderStatus,
} from "@/lib/api";
import { OrderStatusBadge } from "@/lib/order-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscrepancyModal } from "@/components/admin/DiscrepancyPanel";
import StaffKpiRow from "@/components/admin/StaffKpiRow";
import StatusFilterChips, {
  type StatusFilter,
} from "@/components/admin/StatusFilterChips";

// Siguiente estado según la matriz del backend (views.py ADVANCE_MATRIX).
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "processing",
  processing: "ready",
  ready: "shipped",
  shipped: "delivered",
};

const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

// Estados en los que el backend acepta marcar discrepancia (bodega/admin).
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

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [flaggingOrder, setFlaggingOrder] = useState<Order | null>(null);

  useEffect(() => {
    let cancelled = false;

    getStaffOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
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
  }, [reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  async function handleAdvance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setPendingIds((ids) => new Set(ids).add(order.id));
    try {
      const updated = await advanceOrder(order.id, next);
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

  async function handleCancel(order: Order) {
    setPendingIds((ids) => new Set(ids).add(order.id));
    try {
      const updated = await cancelOrder(order.id);
      sileo.success({
        title: "Pedido cancelado",
        description: `El pedido #${updated.id} se canceló y el stock fue restaurado.`,
      });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el pedido.";
      sileo.error({ title: "No se pudo cancelar el pedido", description: message });
    } finally {
      setPendingIds((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(order.id);
        return nextIds;
      });
    }
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl ring-outline-variant/70">
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
      <Card className="rounded-2xl ring-outline-variant/70">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <AlertTriangle className="size-10 text-error" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RotateCcw />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const discrepancyOrders = orders.filter((order) => order.status === "discrepancy");
  const visibleOrders =
    filter === "all" ? orders : orders.filter((order) => order.status === filter);

  return (
    <div className="space-y-4">
      <StaffKpiRow orders={orders} />
      <StatusFilterChips orders={orders} activeFilter={filter} onChange={setFilter} />
      <Card className="rounded-2xl ring-outline-variant/70">
        <CardHeader>
          <CardTitle>Todos los pedidos</CardTitle>
          <CardDescription>
            {orders.length} pedido{orders.length === 1 ? "" : "s"} ·{" "}
            {discrepancyOrders.length} en discrepancia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <PackageOpen className="size-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {orders.length === 0
                  ? "Todavía no hay pedidos."
                  : `No hay pedidos en el estado seleccionado.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
                    <th className="py-2 pr-3 font-medium">Pedido</th>
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Total</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {visibleOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-container-low/60"
                    >
                      <td className="py-2.5 pr-3 font-medium text-foreground">#{order.id}</td>
                      <td className="py-2.5 pr-3 text-foreground">
                        {order.customer || order.shipping_name || "—"}
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
                        <OrderActions
                          order={order}
                          isPending={pendingIds.has(order.id)}
                          onAdvance={handleAdvance}
                          onCancel={handleCancel}
                          onFlag={() => setFlaggingOrder(order)}
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
      <DiscrepancyModal
        order={flaggingOrder}
        onClose={() => setFlaggingOrder(null)}
        onFlagged={() => {
          setFlaggingOrder(null);
          refresh();
        }}
      />
    </div>
  );
}

function OrderActions({
  order,
  isPending,
  onAdvance,
  onCancel,
  onFlag,
}: {
  order: Order;
  isPending: boolean;
  onAdvance: (order: Order) => void;
  onCancel: (order: Order) => void;
  onFlag: (order: Order) => void;
}) {
  if (order.status === "discrepancy") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-error-container px-2.5 py-0.5 text-xs font-semibold text-on-error-container">
          {REASON_LABELS[order.discrepancy_reason ?? ""] ??
            order.discrepancy_reason ??
            "Bloqueado"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          className="bg-error-container text-on-error-container hover:bg-error-container/80"
          disabled={isPending}
          onClick={() => onCancel(order)}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Ban />}
          Cancelar
        </Button>
      </div>
    );
  }

  const next = NEXT_STATUS[order.status];
  const buttons: ReactNode[] = [];

  if (next && !TERMINAL_STATUSES.includes(order.status)) {
    buttons.push(
      <Button
        key="advance"
        size="sm"
        className="bg-primary text-on-primary hover:bg-primary/90"
        disabled={isPending}
        onClick={() => onAdvance(order)}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Avanzar a {next}
      </Button>
    );
  }

  if (FLAGGABLE_STATUSES.includes(order.status)) {
    buttons.push(
      <Button
        key="flag"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => onFlag(order)}
      >
        <Flag />
        Discrepancia
      </Button>
    );
  }

  if (!TERMINAL_STATUSES.includes(order.status)) {
    buttons.push(
      <Button
        key="cancel"
        size="sm"
        variant="destructive"
        className="bg-error-container text-on-error-container hover:bg-error-container/80"
        disabled={isPending}
        onClick={() => onCancel(order)}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Ban />}
        Cancelar
      </Button>
    );
  }

  if (buttons.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin acciones</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {buttons}
    </div>
  );
}