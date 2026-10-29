"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  MapPinned,
  PackageOpen,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import {
  getProducts,
  getStaffOrders,
  type Order,
  type OrderStatus,
  type Product,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Umbral de stock bajo: un producto con stock <= 5 se marca como "Stock bajo";
// con stock 0 pasa a "Sin stock". Es indicador de la vista; el backend sigue
// siendo la fuente de verdad del stock real.
const LOW_STOCK_THRESHOLD = 5;

// Ventana de flujo: últimos 7 días corridos sobre la fecha de creación del
// pedido. Se deriva en cliente del payload de getStaffOrders — no hay
// endpoint de agregación (non-goal del cambio).
const FLOW_DAYS = 7;

const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

function isWithinFlowWindow(createdAt: string, now: Date): boolean {
  const created = new Date(createdAt).getTime();
  const cutoff = now.getTime() - FLOW_DAYS * 24 * 60 * 60 * 1000;
  return created >= cutoff;
}

function sumOrderUnits(orders: Order[]): number {
  return orders.reduce(
    (total, order) =>
      total + order.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
}

function unitsByProduct(orders: Order[]): Map<number, number> {
  const units = new Map<number, number>();
  for (const order of orders) {
    for (const item of order.items) {
      units.set(item.product, (units.get(item.product) ?? 0) + item.quantity);
    }
  }
  return units;
}

function stockLabel(product: Product): string | null {
  if (product.stock === 0) return "Sin stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "Stock bajo";
  return null;
}

// Inventario de bodega: stock por producto (getProducts) y flujo de los
// últimos 7 días derivado en cliente del payload de pedidos (getStaffOrders).
// El flujo no usa agregación: se calcula sobre la ventana acotada de pedidos.
export default function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProducts(), getStaffOrders()])
      .then(([productData, orderData]) => {
        if (!cancelled) {
          setProducts(productData);
          setOrders(orderData);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "No se pudieron cargar el inventario o el flujo. Comprueba que el backend esté ejecutándose."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  function refresh() {
    setRetryKey((key) => key + 1);
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

  const now = new Date();
  const flowOrders = orders.filter((order) => isWithinFlowWindow(order.created_at, now));
  const inTransit = flowOrders.filter(
    (order) => !TERMINAL_STATUSES.includes(order.status)
  ).length;
  const movement = unitsByProduct(flowOrders);
  const sortedProducts = [...products].sort((a, b) => a.stock - b.stock);
  const lowStockCount = products.filter(
    (product) => product.stock <= LOW_STOCK_THRESHOLD
  ).length;

  return (
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          Inventario y flujo
        </CardTitle>
        <CardDescription>
          {products.length} producto{products.length === 1 ? "" : "s"} ·{" "}
          {lowStockCount} con stock bajo o sin stock · movimiento de los últimos {FLOW_DAYS} días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Pedidos ({FLOW_DAYS} días)
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">{flowOrders.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PackageOpen className="size-3.5" />
              Unidades ({FLOW_DAYS} días)
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">{sumOrderUnits(flowOrders)}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPinned className="size-3.5" />
              En tránsito
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">{inTransit}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <PackageOpen className="size-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No hay productos cargados en el catálogo.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
                  <th className="py-2 pr-3 font-medium">Producto</th>
                  <th className="py-2 pr-3 font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Movimiento ({FLOW_DAYS} días)</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {sortedProducts.map((product) => {
                  const label = stockLabel(product);
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-surface-container-low/60">
                      <td className="py-2.5 pr-3 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="py-2.5 pr-3 text-foreground">
                        {product.stock} unidad{product.stock === 1 ? "" : "es"}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {movement.get(product.id) ?? 0} unidad
                        {movement.get(product.id) === 1 ? "" : "es"}
                      </td>
                      <td className="py-2.5">
                        {label === null ? (
                          <span className="text-xs text-muted-foreground">Disponible</span>
                        ) : label === "Sin stock" ? (
                          <span className="rounded-full bg-error-container px-2.5 py-0.5 text-xs font-semibold text-on-error-container">
                            {label}
                          </span>
                        ) : (
                          <span className="rounded-full bg-stock-low/15 px-2.5 py-0.5 text-xs font-semibold text-stock-low">
                            {label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}