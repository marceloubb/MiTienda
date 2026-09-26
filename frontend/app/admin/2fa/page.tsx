import { ShieldCheck } from "lucide-react";
import RequireRole from "@/components/RequireRole";
import TwoFAEnrollView from "@/components/admin/TwoFAEnrollView";

// Alta del dispositivo TOTP del administrador (2FA). El guard es UX-only; la
// aplicación real del rol vive en las DRF permissions de /users/2fa/*.
export default function AdminTwoFAPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <ShieldCheck className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Verificación en dos pasos
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Registra una app de autenticación para exigir un código TOTP además de tu contraseña.
        </p>
        <div className="mt-6 max-w-2xl">
          <TwoFAEnrollView />
        </div>
      </div>
    </RequireRole>
  );
}
