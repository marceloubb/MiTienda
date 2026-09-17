import { Warehouse } from "lucide-react";
import RequireRole from "@/components/RequireRole";

// Thin role-gated shell for the bodega surface. The queue components land
// in PR6 (pending → processing → ready + discrepancy flag).
export default function BodegaPage() {
  return (
    <RequireRole roles={["bodega", "admin"]}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-3 flex items-center gap-3">
          <Warehouse className="size-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Bodega
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Cola de preparación de pedidos: de pendiente a listo para despacho.
        </p>
      </div>
    </RequireRole>
  );
}