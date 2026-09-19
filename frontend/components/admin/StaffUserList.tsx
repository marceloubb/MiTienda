"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { listStaffUsers, type StaffUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_LABELS: Record<StaffUser["role"], string> = {
  admin: "Administrador",
  bodega: "Bodega",
  despacho: "Despacho",
};

interface StaffUserListProps {
  /** Se incrementa al crear un usuario para recargar el resumen. */
  reloadKey?: number;
}

// Resumen de usuarios del staff desde GET /staff/users/ (admin only). El
// endpoint llega en el slice 2 del cambio admin-ux-reorganization; hasta
// entonces esta lista tolera su ausencia con el estado de error.
export default function StaffUserList({ reloadKey = 0 }: StaffUserListProps) {
  const { token } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await listStaffUsers(token));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el resumen del staff."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" aria-hidden="true" />
          <Skeleton className="h-4 w-40" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" aria-hidden="true" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RotateCcw />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          Usuarios del staff
        </CardTitle>
        <CardDescription>
          {users.length} usuario{users.length === 1 ? "" : "s"} registrado
          {users.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="size-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay usuarios del staff.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Usuario</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Rol</th>
                  <th className="py-2 font-medium">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {user.username}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="py-2.5 pr-3 text-foreground">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {user.is_staff ? "Sí" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}