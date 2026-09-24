"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MapPin,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import { sileo } from "sileo";
import { advanceOrder, getStaffOrders, type Order, type OrderStatus } from "@/lib/api";
import { OrderStatusBadge, STATUS_FALLBACK_LABELS } from "@/lib/order-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Rutas de despacho (roles despacho/admin): pedidos listos/enviados/entregados
// agrupados por ciudad de envío. Sin modelo de ruta: el agrupamiento es de
// presentación sobre shipping_city existente. El avance conserva los alcances
// de order-state-machine para despacho (ready → shipped → delivered); el
// backend valida cada transición según su ADVANCE_MATRIX.
const DESPACHO_STATUSES: OrderStatus[] = ["ready", "shipped", "delivered"];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ready: "shipped",
  shipped: "delivered",
};

const UNKNOWN_CITY = "Sin ciudad";

export interface CityGroup {
  city: string;
  orders: Order[];
}

// Agrupamiento puro y determinista por shipping_city: ciudades ordenadas
// alfabéticamente y pedidos por id dentro de cada grupo. Se mantiene puro
// (sin estado, sin efectos) para un futuro test unitario.
export function groupOrdersByCity(orders: Order[]): CityGroup[] {
  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const city = order.shipping_city.trim() || UNKNOWN_CITY;
    const bucket = groups.get(city);
    if (bucket) {
      bucket.push(order);
    } else {
      groups.set(city, [order]);
    }
  }
  return Array.from(groups.entries())
    .map(([city, cityOrders]) => ({ city, orders: cityOrders }))
    .sort((a, b) => a.city.localeCompare(b.city, "es"));
}

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

export default function DispatchRoutesView() {
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
          setOrders(data.filter((order) => DESPACHO_STATUSES.includes(order.status)));
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

  const groups = groupOrdersByCity(orders);

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <Card className="rounded-2xl ring-outline-variant/70">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <PackageOpen className="size-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No hay pedidos listos para despachar.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.city} className="rounded-2xl ring-outline-variant/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                {group.city}
              </CardTitle>
              <CardDescription>
                {group.orders.length} pedido{group.orders.length === 1 ? "" : "s"} en esta ruta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
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
                    {group.orders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-surface-container-low/60">
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
                          <RouteOrderActions
                            order={order}
                            isPending={pendingIds.has(order.id)}
                            onAdvance={handleAdvance}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function RouteOrderActions({
  order,
  isPending,
  onAdvance,
}: {
  order: Order;
  isPending: boolean;
  onAdvance: (order: Order) => void;
}) {
  const next = NEXT_STATUS[order.status];

  if (!next) {
    return <span className="text-xs text-muted-foreground">Sin acciones</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        size="sm"
        className="bg-primary text-on-primary hover:bg-primary/90"
        disabled={isPending}
        onClick={() => onAdvance(order)}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Avanzar a {STATUS_FALLBACK_LABELS[next] ?? next}
      </Button>
    </div>
  );
}