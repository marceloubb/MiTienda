import { ClipboardList, ShieldCheck } from "lucide-react";
import RequireRole from "@/components/RequireRole";
import OrdersDashboard from "@/components/admin/OrdersDashboard";
import DiscrepancyPanel from "@/components/admin/DiscrepancyPanel";

// Gestión de pedidos (tarea única): dashboard de pedidos + resolución de
// discrepancias. El guard es UX-only; la aplicación real de roles vive en las
// DRF permissions (matriz server-side).
export default function AdminOrdersPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <ClipboardList className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Pedidos
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestión de pedidos y resolución de discrepancias.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Matriz server-side activa: el admin puede ejecutar cualquier
            transición, marcar y resolver discrepancias, y cancelar con
            restauración de stock. El backend rechaza (403) lo que el rol no
            puede hacer.
          </p>
        </div>
        <div className="mt-6">
          <OrdersDashboard />
        </div>
        <div className="mt-6">
          <DiscrepancyPanel />
        </div>
      </div>
    </RequireRole>
  );
}