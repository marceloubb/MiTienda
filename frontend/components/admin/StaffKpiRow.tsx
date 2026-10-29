"use client";

import { AlertTriangle, Boxes, Truck, Warehouse } from "lucide-react";
import { cn } from "cn";
import type { Order, OrderStatus } from "@/lib/api";

// Fila de KPIs del panel de operaciones staff. Honestidad de datos (D1): los
// valores se derivan SIEMPRE del payload real de getStaffOrders — no hay
// KPIs inventados ni agregación de backend (non-goal del cambio).
const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];
const BODEGA_STATUSES: OrderStatus[] = ["pending", "processing", "ready"];

interface StaffKpiRowProps {
  orders: Order[];
}

export default function StaffKpiRow({ orders }: StaffKpiRowProps) {
  const active = orders.filter((order) => !TERMINAL_STATUSES.includes(order.status)).length;
  const inBodega = orders.filter((order) => BODEGA_STATUSES.includes(order.status)).length;
  const inDespacho = orders.filter((order) => order.status === "shipped").length;
  const discrepancies = orders.filter((order) => order.status === "discrepancy").length;

  return (
    <section
      aria-label="Indicadores de operación"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <KpiCard
        label="Activas"
        value={active}
        icon={<Boxes className="size-6 text-primary" />}
        valueClassName="text-primary"
      />
      <KpiCard
        label="En bodega"
        value={inBodega}
        icon={<Warehouse className="size-6 text-primary" />}
        valueClassName="text-on-surface"
      />
      <KpiCard
        label="En despacho"
        value={inDespacho}
        icon={<Truck className="size-6 text-on-secondary-container" />}
        valueClassName="text-on-secondary-container"
      />
      <KpiCard
        label="Discrepancias"
        value={discrepancies}
        icon={<AlertTriangle className="size-6 text-error" />}
        valueClassName="text-error"
        tone="error"
      />
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon,
  valueClassName,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClassName: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-level-1 ring-1 ring-outline-variant/60",
        tone === "error" && "bg-error-container/50 ring-error/20"
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-extrabold", valueClassName)}>{value}</p>
      </div>
      {icon}
    </div>
  );
}