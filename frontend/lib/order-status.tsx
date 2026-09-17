"use client";

import { Badge } from "@/components/ui/badge";

// Shared order status styles for staff surfaces and the customer orders page.
// Values come from backend/orders/models.py (STATUS_CHOICES): pending,
// processing, ready, shipped, delivered, cancelled, discrepancy.
export interface OrderStatusStyle {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export const ORDER_STATUS_STYLES: Record<string, OrderStatusStyle> = {
  pending: { variant: "secondary" },
  processing: { variant: "outline" },
  // ready: primary tint; discrepancy: destructive tint (design).
  ready: { variant: "default", className: "bg-primary/10 text-primary" },
  shipped: {
    variant: "outline",
    className: "border-transparent bg-stock/10 text-stock",
  },
  delivered: { variant: "default", className: "bg-stock text-white" },
  cancelled: { variant: "destructive" },
  discrepancy: { variant: "destructive", className: "bg-destructive/15" },
};

export const STATUS_FALLBACK_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  ready: "Listo para despacho",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  discrepancy: "Discrepancia",
};

export function OrderStatusBadge({
  status,
  display,
}: {
  status: string;
  display?: string;
}) {
  const style = ORDER_STATUS_STYLES[status] ?? { variant: "outline" as const };
  const label = display || STATUS_FALLBACK_LABELS[status] || status;
  return (
    <Badge variant={style.variant} className={style.className}>
      {label}
    </Badge>
  );
}