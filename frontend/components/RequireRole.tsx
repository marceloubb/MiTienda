"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/api";

interface RequireRoleProps {
  roles: UserRole[];
  /** Where to send authenticated users whose role is not allowed (default "/"). */
  redirectTo?: string;
  children: ReactNode;
}

/**
 * UX-only route guard. Renders children only when the authenticated user's
 * role is one of `roles`. Loading renders nothing, unauthenticated users go
 * to /login, and role mismatches redirect to `redirectTo`. Real enforcement
 * lives server-side in the DRF permission classes.
 */
export default function RequireRole({
  roles,
  redirectTo = "/",
  children,
}: RequireRoleProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Legacy sessions may lack a role; the backend defaults to customer.
  const effectiveRole: UserRole = user?.role ?? "customer";
  const hasRole = roles.includes(effectiveRole);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!hasRole) {
      router.push(redirectTo);
    }
  }, [hasRole, isLoading, redirectTo, router, user]);

  if (isLoading || !user || !hasRole) {
    return null;
  }

  return <>{children}</>;
}