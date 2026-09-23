"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import RequireRole from "@/components/RequireRole";

// /admin ya no mezcla tareas: cada superficie tiene una ruta propia y esta
// página redirige al admin al panel de pedidos. El guard es UX-only; la
// aplicación real de roles vive en las DRF permissions.
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      router.replace("/admin/orders");
    }
  }, [isLoading, router, user]);

  return (
    <RequireRole roles={["admin"]}>
      <></>
    </RequireRole>
  );
}