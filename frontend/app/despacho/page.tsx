import { Truck } from "lucide-react";
import RequireRole from "@/components/RequireRole";

// Thin role-gated shell for the despacho surface. The queue components land
// in PR6 (ready → shipped → delivered).
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
          Cola de envío de pedidos: de listo para despacho a entregado.
        </p>
      </div>
    </RequireRole>
  );
}