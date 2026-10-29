"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "cn";
import { sileo } from "sileo";
import {
  cancelOrder,
  flagDiscrepancy,
  getStaffOrders,
  resolveDiscrepancy,
  type DiscrepancyReason,
  type Order,
} from "@/lib/api";
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
      <Card className="rounded-2xl ring-outline-variant/70">
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
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-error" />
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
            <p className="text-sm text-error">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RotateCcw />
              Reintentar
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-on-secondary-container" />
            No hay pedidos con discrepancia.
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
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
                  <p className="mt-1 inline-block rounded-full bg-error-container px-2.5 py-0.5 text-xs font-semibold text-on-error-container">
                    {REASON_LABELS[order.discrepancy_reason ?? ""] ??
                      order.discrepancy_reason ??
                      "Sin motivo"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-on-secondary-container text-on-secondary hover:bg-on-secondary-container/90"
                    disabled={pendingIds.has(order.id)}
                    onClick={() => handleResolve(order)}
                  >
                    {pendingIds.has(order.id) && <Loader2 className="animate-spin" />}
                    Resolver
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-error-container text-on-error-container hover:bg-error-container/80"
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

const REASON_OPTIONS: {
  value: DiscrepancyReason;
  title: string;
  description: string;
}[] = [
  {
    value: "missing",
    title: "missing (Stock faltante)",
    description:
      "El producto no se encuentra en el estante físico indicado o el stock del sistema no coincide.",
  },
  {
    value: "damaged",
    title: "damaged (Producto dañado)",
    description: "Caja golpeada, sello roto o daño estético en la unidad encontrada.",
  },
];

// Modal de reporte de discrepancia (bodega/admin). Solo envía el motivo que el
// backend acepta (missing|damaged); la orden queda en estado "discrepancy"
// hasta que un administrador la resuelva o cancele. Honestidad (D1): no hay
// campos decorativos que el API no persista.
export function DiscrepancyModal({
  order,
  onClose,
  onFlagged,
}: {
  order: Order | null;
  onClose: () => void;
  onFlagged?: () => void;
}) {
  const [reason, setReason] = useState<DiscrepancyReason>("missing");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return null;
  }

  async function handleSubmit() {
    if (!order) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await flagDiscrepancy(order.id, reason);
      sileo.success({
        title: "Discrepancia marcada",
        description: `El pedido #${updated.id} quedó bloqueado por "${reason}".`,
      });
      onFlagged?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo marcar la discrepancia.";
      setError(message);
      sileo.error({ title: "No se pudo marcar la discrepancia", description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discrepancy-modal-title"
        className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-level-2 ring-1 ring-outline-variant"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error-container">
              <AlertTriangle className="size-5 text-error" />
            </div>
            <div className="min-w-0">
              <h2
                id="discrepancy-modal-title"
                className="font-heading text-base font-bold text-foreground"
              >
                Reportar discrepancia
              </h2>
              <p className="text-sm text-on-surface-variant">
                Pedido #{order.id} · {order.customer || order.shipping_name || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <fieldset className="mt-5 space-y-2">
          <legend className="text-sm font-semibold text-foreground">
            Motivo reconocido por el backend
          </legend>
          {REASON_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors",
                reason === option.value
                  ? "bg-primary-container/15 ring-primary/40"
                  : "bg-surface-container-low ring-transparent hover:bg-surface-container"
              )}
            >
              <input
                type="radio"
                name="discrepancy-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="mt-1 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {option.title}
                </span>
                <span className="block text-xs text-on-surface-variant">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-error-container/40 p-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-error" />
          <p className="text-xs leading-relaxed text-on-surface-variant">
            La orden pasará a estado discrepancy (bloqueada): se suspende el flujo
            hasta que un administrador la resuelva o cancele con restauración de
            stock.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 bg-error text-on-error hover:bg-error/90"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Bloqueando..." : "Confirmar y bloquear"}
          </Button>
        </div>
      </div>
    </div>
  );
}