"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CreditCard,
  Package,
  RotateCcw,
  Route,
  ShoppingCart,
  StickyNote,
  Truck,
  XCircle,
} from "lucide-react";
import { addToCart, APIError, getOrder, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { OrderStatusBadge } from "@/lib/order-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sileo } from "sileo";
import { cn } from "cn";

// Mismos valores que app/checkout/page.tsx (PAYMENT_METHODS).
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  paypal: "PayPal",
  cash: "Efectivo contra entrega",
};

function formatPrice(value: string): string {
  return `$${parseFloat(value).toFixed(2)}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_LABELS[value] ?? value.replace(/_/g, " ");
}

// Cinco pasos del seguimiento (wireframe seguimiento_de_orden + spec.md).
// El orden de status aquí es la cadena canónica pendiente→entregada.
const TIMELINE_STEPS = [
  {
    status: "pending",
    label: "Orden Recibida",
    description: "Pago confirmado y orden registrada en el sistema",
  },
  {
    status: "processing",
    label: "Preparando en Bodega",
    description: "Productos empacados con sello de seguridad",
  },
  {
    status: "ready",
    label: "Lista para Despacho",
    description: "Lista para salir del local",
  },
  {
    status: "shipped",
    label: "En Reparto",
    description: "En camino hacia tu ubicación",
  },
  {
    status: "delivered",
    label: "Entregada",
    description: "Firma o recepción en conserjería",
  },
] as const;

// Estados terminales fuera de la cadena de 5 pasos.
const TERMINAL_STATUSES = ["cancelled", "discrepancy"];
const TRACKED_STATUSES = TIMELINE_STEPS.map((step) => step.status);

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        const data = await getOrder(Number(params.id));
        if (!cancelled) {
          setOrder(data);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        // El backend filtra por usuario; otro pedido responde 404.
        if (err instanceof APIError && err.status === 404) {
          router.replace("/orders");
          return;
        }
        setError(
          "No pudimos cargar el seguimiento. Asegúrate de que el backend esté ejecutándose."
        );
        sileo.error({
          title: "Error al cargar el seguimiento",
          description: "Revisá que el backend esté activo.",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadOrder();
    return () => {
      cancelled = true;
    };
  }, [params.id, user, reloadKey, router]);

  if (isAuthLoading || !user) {
    return <TrackingSkeleton />;
  }

  if (isLoading) {
    return <TrackingSkeleton />;
  }

  if (error && !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-2xl p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">
            No pudimos cargar el seguimiento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setReloadKey((key) => key + 1);
            }}
            className="mt-6"
          >
            <RotateCcw />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return <OrderTrackingContent order={order!} />;
}

function OrderTrackingContent({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link href="/orders" className="hover:text-primary">
              Mis pedidos
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="text-foreground">
            Pedido #{order.id}
          </li>
        </ol>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Pedido <span className="text-primary">#{order.id}</span>
        </h1>
        <OrderStatusBadge status={order.status} display={order.status_display} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Realizado el {formatDateTime(order.created_at)}
      </p>

      <div className="mt-6 space-y-6">
        <DeliveryTimeline order={order} />
        {order.status === "delivered" && <DeliveredDetail order={order} />}
      </div>
    </div>
  );
}

// --- Timeline (D4: timestamps SOLO desde OrderEvent, nunca updated_at) ------
function DeliveryTimeline({ order }: { order: Order }) {
  // Fecha/hora exacta en la que cada status se alcanzó, según lo registra el
  // último evento que entró a ese status (los eventos vienen ascendentes).
  const reachedAt: Partial<Record<(typeof TIMELINE_STEPS)[number]["status"], string>> =
    {};
  for (const event of order.events) {
    if ((TRACKED_STATUSES as string[]).includes(event.to_status)) {
      reachedAt[event.to_status as keyof typeof reachedAt] = event.timestamp;
    }
  }

  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const activeIndex = TIMELINE_STEPS.findIndex(
    (step) => step.status === order.status
  );
  const lastReachedIndex = TIMELINE_STEPS.reduce(
    (acc, step, index) => (reachedAt[step.status] ? index : acc),
    -1
  );

  const terminalEvent = isTerminal
    ? order.events.find((event) => event.event_type === order.status)
    : undefined;

  const markerIndex = isTerminal ? lastReachedIndex : -1;

  return (
    <section aria-label="Estado del pedido">
      <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-level-1 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-on-surface">
            <Route className="size-5 text-primary" />
            Estado del Pedido
          </h2>
          <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-xs font-bold text-on-surface-variant">
            Paso{" "}
            {Math.max(isTerminal ? lastReachedIndex : activeIndex, -1) + 1} de 5
          </span>
        </div>

        <div className="relative pl-1">
          {/* Línea vertical de la timeline */}
          <div className="absolute top-4 bottom-4 left-[17px] w-[2px] bg-outline-variant" />

          <ol className="space-y-5">
            {TIMELINE_STEPS.map((step, index) => {
              const reached = Boolean(reachedAt[step.status]);
              const active = !isTerminal && index === activeIndex;

              return (
                <li key={step.status}>
                  <div className="relative flex items-start gap-3">
                    {reached ? (
                      <span
                        className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full shadow-level-1",
                          "bg-secondary text-on-secondary",
                          active && "ring-4 ring-on-primary-container"
                        )}
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          active
                            ? "bg-primary-container text-on-primary ring-4 ring-on-primary-container"
                            : "bg-surface-container-high text-outline"
                        )}
                      >
                        {active ? (
                          <Truck className="size-4 animate-pulse" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                    )}

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            active
                              ? "text-primary-container"
                              : reached
                                ? "text-on-surface"
                                : "text-outline"
                          )}
                        >
                          {index + 1}. {step.label}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            active
                              ? "font-semibold text-primary-container"
                              : reached
                                ? "text-outline"
                                : "text-outline-variant"
                          )}
                        >
                          {reached && reachedAt[step.status]
                            ? formatDateTime(reachedAt[step.status]!)
                            : active
                              ? "En curso"
                              : "Pendiente"}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs",
                          active || reached
                            ? "text-on-surface-variant"
                            : "text-outline"
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Marcador terminal (cancelado / discrepancia) */}
                  {isTerminal && index === markerIndex && terminalEvent && (
                    <div
                      className={cn(
                        "relative z-10 mt-4 flex items-start gap-3 rounded-xl p-3 ring-1",
                        "bg-error/10 ring-error/30"
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-error text-on-error">
                        <XCircle className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-error">
                            {order.status === "cancelled"
                              ? "Pedido cancelado"
                              : "Discrepancia en el pedido"}
                          </p>
                          <span className="shrink-0 text-xs font-semibold text-error">
                            {formatDateTime(terminalEvent.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.status === "discrepancy" &&
                          order.discrepancy_reason
                            ? order.discrepancy_reason
                            : order.status === "cancelled"
                              ? "El pedido fue cancelado y no continúa su entrega."
                              : "Nuestro equipo está revisando el pedido."}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// --- Detalle de pedido entregado (spec: Requirement) ------------------------
function DeliveredDetail({ order }: { order: Order }) {
  const items = order.items ?? [];

  return (
    <section aria-label="Detalle del pedido entregado">
      <Card className="rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Package className="size-5 text-primary" />
          Detalle del pedido
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Productos</h3>
            <ul className="mt-2 divide-y divide-outline-variant">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground">{item.product_name}</span>
                    <span className="ml-1 text-muted-foreground">
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-medium text-foreground">
                      {formatPrice(item.subtotal)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({formatPrice(item.price)} c/u)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Truck className="size-4 text-primary" />
              Envío
            </h3>
            <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Destinatario</dt>
                <dd className="font-medium text-foreground">
                  {order.shipping_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Teléfono</dt>
                <dd className="font-medium text-foreground">
                  {order.shipping_phone}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Dirección</dt>
                <dd className="font-medium text-foreground">
                  {order.shipping_address}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ciudad</dt>
                <dd className="font-medium text-foreground">
                  {order.shipping_city}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Código postal</dt>
                <dd className="font-medium text-foreground">
                  {order.shipping_postal_code}
                </dd>
              </div>
            </dl>
          </div>

          <Separator />

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className="size-4 text-primary" />
              Pago
            </h3>
            <p className="mt-1 text-sm text-foreground">
              {paymentMethodLabel(order.payment_method)}
            </p>
          </div>

          {order.notes?.trim() && (
            <>
              <Separator />
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <StickyNote className="size-4 text-primary" />
                  Notas
                </h3>
                <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                  {order.notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total pagado</p>
              <p className="text-xl font-bold text-foreground">
                {formatPrice(order.total)}
              </p>
            </div>
            <RebuyButton order={order} />
          </div>
        </div>
      </Card>
    </section>
  );
}

// --- Recompra: agrega cada item al carrito, salta inactivos con aviso --------
function RebuyButton({ order }: { order: Order }) {
  const { updateCart } = useAuth();
  const [isRebuying, setIsRebuying] = useState(false);

  async function handleRebuy() {
    setIsRebuying(true);
    const skipped: string[] = [];
    let cart = null;

    try {
      for (const item of order.items) {
        try {
          cart = await addToCart(item.product, item.quantity);
        } catch {
          // Producto inactivo (backend responde 404): se salta y se avisa.
          skipped.push(item.product_name);
        }
      }
      if (cart) {
        updateCart(cart);
      }
      if (skipped.length > 0) {
        sileo.info({
          title: "Algunos productos no están disponibles",
          description: `No se agregaron: ${skipped.join(", ")}`,
        });
      } else {
        sileo.success({
          title: "Productos agregados al carrito",
          description: "Tu pedido anterior está listo en el carrito.",
        });
      }
    } finally {
      setIsRebuying(false);
    }
  }

  return (
    <Button onClick={handleRebuy} disabled={isRebuying}>
      <ShoppingCart />
      {isRebuying ? "Agregando…" : "Volver a comprar"}
    </Button>
  );
}

function TrackingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-52" aria-hidden="true" />
      <Skeleton className="mt-3 h-9 w-56" aria-hidden="true" />
      <div className="mt-6">
        <div className="rounded-2xl bg-surface-container-lowest p-5 ring-1 ring-outline-variant sm:p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44" aria-hidden="true" />
            <Skeleton className="h-5 w-20 rounded-full" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" aria-hidden="true" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" aria-hidden="true" />
                  <Skeleton className="h-3 w-64" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}