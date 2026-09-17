import { ShieldCheck } from "lucide-react";
import RequireRole from "@/components/RequireRole";
import StaffUserForm from "@/components/admin/StaffUserForm";
import OrdersDashboard from "@/components/admin/OrdersDashboard";

// Superficie de administración: pedidos y usuarios del staff.
// El guard es UX-only; la aplicación real de roles vive en las DRF permissions.
export default function AdminPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <ShieldCheck className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Administración
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestión de pedidos y usuarios del staff.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section aria-label="Pedidos" className="min-w-0 lg:col-span-2">
            <OrdersDashboard />
          </section>
          <aside aria-label="Usuario del staff" className="min-w-0">
            <StaffUserForm />
          </aside>
        </div>
      </div>
    </RequireRole>
  );
}