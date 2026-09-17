import { ShieldCheck } from "lucide-react";
import RequireRole from "@/components/RequireRole";

// Thin role-gated shell for the admin surface. The dashboard components
// (orders table, discrepancy panel, staff-user form) land in PR5.
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
          Gestión de pedidos, discrepancias y usuarios del staff.
        </p>
      </div>
    </RequireRole>
  );
}