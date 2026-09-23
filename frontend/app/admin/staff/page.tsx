import { UserCog } from "lucide-react";
import RequireRole from "@/components/RequireRole";
import StaffManagementView from "@/components/admin/StaffManagementView";

// Gestión del staff (tarea única): alta de usuarios + resumen de los
// registrados. El guard es UX-only; la aplicación real de roles vive en las
// DRF permissions.
export default function AdminStaffPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <UserCog className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Gestión del staff
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Alta de usuarios del staff y resumen de los registrados.
        </p>
        <div className="mt-6">
          <StaffManagementView />
        </div>
      </div>
    </RequireRole>
  );
}