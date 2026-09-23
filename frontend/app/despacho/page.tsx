"use client";

import { Truck } from "lucide-react";
import DispatchRoutesView from "@/components/admin/DispatchRoutesView";
import RequireRole from "@/components/RequireRole";

export default function DespachoPage() {
  return (
    <RequireRole roles={["despacho", "admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <Truck className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Despacho
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Rutas de envío: pedidos agrupados por ciudad, de listo para despacho
          a entregado.
        </p>
        <div className="mt-6">
          <DispatchRoutesView />
        </div>
      </div>
    </RequireRole>
  );
}