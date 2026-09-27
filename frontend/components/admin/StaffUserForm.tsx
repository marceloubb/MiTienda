"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { sileo } from "sileo";
import { createStaffUser, APIError, type UserRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Roles permitidos para el staff (se excluye customer; el backend lo valida).
type StaffRole = Exclude<UserRole, "customer">;

const STAFF_ROLES: StaffRole[] = ["admin", "bodega", "despacho"];

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrador",
  bodega: "Bodega",
  despacho: "Despacho",
};

const ROLE_HINTS: Record<StaffRole, string> = {
  admin: "Acceso total: pedidos, discrepancias y usuarios del staff.",
  bodega: "Preparación de pedidos: pending → processing → ready.",
  despacho: "Entrega: ready → shipped → delivered.",
};

// El proyecto no tiene componente Input/Label/Select en components/ui;
// se usan elementos nativos con el estilo visual del resto del sitio.
const fieldClasses =
  "h-9 w-full rounded-xl border border-control-border bg-surface-container-lowest px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40 disabled:opacity-50";

interface StaffUserFormProps {
  /** Callback tras crear un usuario con éxito (refresca el resumen del staff). */
  onCreated?: () => void;
}

export default function StaffUserForm({ onCreated }: StaffUserFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("bodega");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);
    try {
      const user = await createStaffUser({ username, email, password, role });
      sileo.success({
        title: "Usuario creado",
        description: `"${user.username}" se creó con el rol ${ROLE_LABELS[role]}.`,
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("bodega");
      onCreated?.();
    } catch (err) {
      if (err instanceof APIError && err.fields) {
        const detail = Object.entries(err.fields)
          .map(([field, messages]) => `${FIELD_LABELS[field] ?? field}: ${messages.join(", ")}`)
          .join(" · ");
        setError(detail);
        sileo.error({ title: "No se pudo crear el usuario", description: detail });
      } else {
        const message = err instanceof Error ? err.message : "Error al crear el usuario.";
        setError(message);
        sileo.error({ title: "No se pudo crear el usuario", description: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-4 text-primary" />
          Crear usuario del staff
        </CardTitle>
        <CardDescription>
          Da de alta a un administrador, bodeguero o despachador sin pasar por el
          panel de Django.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="staff-username"
              className="text-xs font-medium text-foreground"
            >
              Nombre de usuario
            </label>
            <input
              id="staff-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ej: maria.bodega"
              required
              className={fieldClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="staff-email" className="text-xs font-medium text-foreground">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ej: maria@mitienda.com"
              required
              className={fieldClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="staff-password"
              className="text-xs font-medium text-foreground"
            >
              Contraseña
            </label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              className={fieldClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="staff-role" className="text-xs font-medium text-foreground">
              Rol
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              className={fieldClasses}
            >
              {STAFF_ROLES.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Creando…" : "Crear usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const FIELD_LABELS: Record<string, string> = {
  username: "Usuario",
  email: "Email",
  password: "Contraseña",
  role: "Rol",
};