"use client";

import { useState } from "react";
import StaffUserForm from "./StaffUserForm";
import StaffUserList from "./StaffUserList";

// Pantalla única de gestión del staff: el formulario de alta y el resumen de
// usuarios registrados. El resumen se recarga al crear un usuario (reloadKey)
// para reflejarlo de inmediato.
export default function StaffManagementView() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section aria-label="Usuario del staff" className="min-w-0">
        <StaffUserForm onCreated={() => setReloadKey((key) => key + 1)} />
      </section>
      <section aria-label="Usuarios registrados" className="min-w-0 lg:col-span-2">
        <StaffUserList reloadKey={reloadKey} />
      </section>
    </div>
  );
}