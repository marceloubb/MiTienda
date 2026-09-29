"use client";

import { cn } from "cn";
import type { Order, OrderStatus } from "@/lib/api";

export type StatusFilter = "all" | OrderStatus;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendientes",
  processing: "Procesando",
  ready: "Listos",
  shipped: "Enviados",
  delivered: "Entregados",
  cancelled: "Cancelados",
  discrepancy: "Discrepancias",
};

interface StatusFilterChipsProps {
  orders: Order[];
  activeFilter: StatusFilter;
  onChange: (filter: StatusFilter) => void;
}

// Chips de filtro por estado sobre el payload real de pedidos (D1): solo
// aparecen los estados presentes en los datos, con su conteo derivado.
export default function StatusFilterChips({
  orders,
  activeFilter,
  onChange,
}: StatusFilterChipsProps) {
  const present = [...new Set(orders.map((order) => order.status))].sort();
  const countFor = (status: OrderStatus) =>
    orders.filter((order) => order.status === status).length;

  if (present.length === 0) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Filtrar pedidos por estado"
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      <Chip
        label={`Todas (${orders.length})`}
        active={activeFilter === "all"}
        onClick={() => onChange("all")}
      />
      {present.map((status) => (
        <Chip
          key={status}
          label={`${STATUS_LABELS[status] ?? status} (${countFor(status)})`}
          active={activeFilter === status}
          tone={status === "discrepancy" ? "error" : "default"}
          onClick={() => onChange(status)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  tone = "default",
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: "default" | "error";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        tone === "error"
          ? active
            ? "bg-error text-on-error shadow-level-1"
            : "bg-error-container text-on-error-container hover:bg-error-container/80"
          : active
            ? "bg-primary font-bold text-on-primary shadow-level-1"
            : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
      )}
    >
      {label}
    </button>
  );
}