"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Package,
  PackageOpen,
  RotateCcw,
  StickyNote,
  Truck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getOrders, Order } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sileo } from "sileo";

// Los valores de status provienen de backend/orders/models.py (STATUS_CHOICES).
const ORDER_STATUS_STYLES: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  pending: { variant: "secondary" },
  processing: { variant: "outline" },
  shipped: {
    variant: "outline",
    className: "border-transparent bg-stock/10 text-stock",
  },
  delivered: { variant: "default", className: "bg-stock text-white" },
  cancelled: { variant: "destructive" },
};

const FALLBACK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_LABELS[value] ?? value.replace(/_/g, " ");
}

function OrderStatusBadge({
  status,
  display,
}: {
  status: string;
  display: string;
}) {
  const style = ORDER_STATUS_STYLES[status] ?? { variant: "outline" as const };
  const label = display || FALLBACK_STATUS_LABELS[status] || status;
  return (
    <Badge variant={style.variant} className={style.className}>
      {label}
    </Badge>
  );
}

export default function OrdersPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user || !token) {
    return <OrdersSkeleton />;
  }

  return <OrdersContent token={token} />;
}

function OrdersContent({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getOrders(token)
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Error al cargar tus pedidos. Asegúrate de que el backend esté ejecutándose."
          );
          sileo.error({
            title: "Error al cargar los pedidos",
            description: "Asegúrate de que el backend esté ejecutándose.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">
            No pudimos cargar tus pedidos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button onClick={handleRetry} className="mt-6">
            <RotateCcw />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
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
          <li aria-current="page" className="text-foreground">
            Mis pedidos
          </li>
        </ol>
      </nav>

      {/* Encabezado */}
      <div className="mt-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Mis pedidos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} pedido{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="mt-8 w-full p-12 text-center">
          <PackageOpen className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Todavía no tenés pedidos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando hagas tu primera compra, podrás verla y seguirla desde aquí.
          </p>
          <Link
            href="/products"
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            Ir al catálogo
          </Link>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const items = order.items ?? [];
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Pedido{" "}
            <span className="text-primary">#{order.id}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} display={order.status_display} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          {totalItems} artículo{totalItems === 1 ? "" : "s"}
        </span>
        <span className="font-bold text-foreground">
          Total: {formatPrice(order.total)}
        </span>
      </div>

      {/* Detalle expandible */}
      <details className="group mt-3">
        <summary className="flex w-full cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-primary outline-none select-none marker:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 [&::-webkit-details-marker]:hidden">
          <span>Ver detalle</span>
          <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <section aria-label={`Productos del pedido ${order.id}`}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="size-4 text-primary" />
              Productos
            </h3>
            <ul className="mt-2 divide-y divide-border">
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
          </section>

          <Separator />

          <section aria-label={`Envío del pedido ${order.id}`}>
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
          </section>

          <Separator />

          <section aria-label={`Pago del pedido ${order.id}`}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className="size-4 text-primary" />
              Pago
            </h3>
            <p className="mt-1 text-sm text-foreground">
              {paymentMethodLabel(order.payment_method)}
            </p>
          </section>

          {order.notes?.trim() && (
            <>
              <Separator />
              <section aria-label={`Notas del pedido ${order.id}`}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <StickyNote className="size-4 text-primary" />
                  Notas
                </h3>
                <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                  {order.notes}
                </p>
              </section>
            </>
          )}
        </div>
      </details>
    </Card>
  );
}

function OrdersSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-6 w-44" aria-hidden="true" />
      <Skeleton className="mt-3 h-10 w-56" aria-hidden="true" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-card p-5 ring-1 ring-border"
          >
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-40" aria-hidden="true" />
              <Skeleton className="h-5 w-24 rounded-full" aria-hidden="true" />
            </div>
            <Skeleton className="mt-4 h-4 w-32" aria-hidden="true" />
            <Skeleton className="mt-3 h-4 w-full" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}