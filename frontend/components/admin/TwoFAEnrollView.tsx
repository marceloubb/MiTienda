"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { sileo } from "sileo";
import { APIError, enroll2FA, type TwoFAEnrollment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TOTPSecretCard from "@/components/admin/TOTPSecretCard";
import TOTPConfirmForm from "@/components/admin/TOTPConfirmForm";

type EnrollState =
  | { phase: "idle" }
  | { phase: "enrolling" }
  | { phase: "pending"; device: TwoFAEnrollment }
  | { phase: "confirmed" }
  // The backend refused to issue a new secret because a device is already
  // confirmed; its message is rendered verbatim.
  | { phase: "already"; message: string }
  | { phase: "error"; message: string };

/**
 * Admin 2FA enrollment: start a TOTP device, show the secret, confirm the code.
 * The flow has three real end states — pending (needs a code), confirmed, and
 * already-confirmed — and every message the user sees comes from the backend.
 */
export default function TwoFAEnrollView() {
  const [state, setState] = useState<EnrollState>({ phase: "idle" });

  async function handleEnroll() {
    setState({ phase: "enrolling" });
    try {
      const device = await enroll2FA();
      setState({ phase: "pending", device });
    } catch (err) {
      if (err instanceof APIError && err.status === 400) {
        // The only 400 from enroll is "device already confirmed".
        setState({ phase: "already", message: err.message });
        return;
      }
      const message =
        err instanceof APIError ? err.message : "No se pudo iniciar la inscripción.";
      setState({ phase: "error", message });
      sileo.error({ title: "No se pudo iniciar la inscripción", description: message });
    }
  }

  if (state.phase === "confirmed") {
    return (
      <Card className="rounded-2xl ring-outline-variant/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            2FA activado
          </CardTitle>
          <CardDescription>
            Tu dispositivo quedó confirmado. A partir de ahora el backend te va a pedir un
            código TOTP en cada inicio de sesión.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state.phase === "already") {
    return (
      <Card className="rounded-2xl ring-outline-variant/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            2FA ya está activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
            <span>{state.message}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.phase === "pending") {
    return (
      <div className="space-y-6">
        <TOTPSecretCard
          secret={state.device.secret}
          provisioningUri={state.device.provisioning_uri}
        />
        <TOTPConfirmForm
          deviceId={state.device.device_id}
          onConfirmed={() => {
            setState({ phase: "confirmed" });
            sileo.success({
              title: "2FA activado",
              description: "El dispositivo quedó confirmado.",
            });
          }}
        />
      </div>
    );
  }

  return (
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4 text-primary" />
          Activar la verificación en dos pasos
        </CardTitle>
        <CardDescription>
          Genera un secreto TOTP para tu cuenta. Necesitás una app de autenticación para
         escuchar el código de 6 dígitos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.phase === "error" && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-xs text-error">
            {state.message}
          </p>
        )}

        <Button
          type="button"
          onClick={handleEnroll}
          disabled={state.phase === "enrolling"}
          className="bg-primary text-on-primary hover:bg-primary/90"
        >
          {state.phase === "enrolling" ? (
            <>
              <Loader2 className="animate-spin" />
              Generando secreto…
            </>
          ) : (
            <>
              <ShieldCheck />
              Comenzar inscripción
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
