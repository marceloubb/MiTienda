"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Save,
  User,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, User as UserType } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sileo } from "sileo";

const inputClass =
  "w-full rounded-xl border border-control-border bg-surface-container-lowest py-2.5 pr-4 pl-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

const iconClass =
  "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-40" aria-hidden="true" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" aria-hidden="true" />
        <Skeleton className="mt-6 h-96 w-full rounded-2xl" aria-hidden="true" />
      </div>
    );
  }

  return <ProfileContent user={user} />;
}

function ProfileContent({ user }: { user: UserType }) {
  const { refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(() => ({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    phone: user.profile?.phone || "",
    address: user.profile?.address || "",
    city: user.profile?.city || "",
    postal_code: user.profile?.postal_code || "",
  }));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSaving(true);
    try {
      await updateProfile(formData);
      await refreshProfile();
      sileo.success({
        title: "Perfil actualizado",
        description: "Tus datos se guardaron correctamente.",
      });
    } catch {
      sileo.error({
        title: "Error al actualizar el perfil",
        description: "Revisa los datos e inténtalo de nuevo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground">Mi perfil</h1>

      {/* Encabezado */}
      <Card className="mt-6 rounded-2xl p-6 ring-outline-variant/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {user.username}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
            <Receipt />
            Ver mis pedidos
          </Link>
        </div>
      </Card>

      {/* Formulario */}
      <Card className="mt-6 rounded-2xl p-6 ring-outline-variant/70">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Datos personales
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className={labelClass}>
                  Nombre
                </label>
                <div className="relative">
                  <User className={iconClass} />
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={inputClass}
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className={labelClass}>
                  Apellido
                </label>
                <div className="relative">
                  <UserRound className={iconClass} />
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={inputClass}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <div className="relative">
                <Mail className={iconClass} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Teléfono
              </label>
              <div className="relative">
                <Phone className={iconClass} />
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-outline-variant pt-6">
            <h3 className="text-base font-bold text-foreground">
              Dirección de envío
            </h3>

            <div>
              <label htmlFor="address" className={labelClass}>
                Dirección
              </label>
              <div className="relative">
                <MapPin className={iconClass} />
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="street-address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className={labelClass}>
                  Ciudad
                </label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-control-border bg-surface-container-lowest px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label htmlFor="postal_code" className={labelClass}>
                  Código postal
                </label>
                <input
                  id="postal_code"
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-control-border bg-surface-container-lowest px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40"
                  autoComplete="postal-code"
                />
              </div>
            </div>
          </section>

          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            className="w-full bg-primary text-on-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save />
                Guardar cambios
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}