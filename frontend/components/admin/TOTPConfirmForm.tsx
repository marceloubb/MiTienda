"use client";

import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { APIError, confirm2FA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClasses =
  "h-9 w-full rounded-xl border border-control-border bg-surface-container-lowest px-3 text-center font-mono text-sm tracking-[0.4em] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40 disabled:opacity-50";

interface TOTPConfirmFormProps {
  /** Pending device from the enroll response. */
  deviceId: number;
  /** Called after the backend confirms the device. */
  onConfirmed: () => void;
}

/**
 * Step 2 of enrollment: submit the current 6-digit code to activate the device.
 * A wrong code surfaces the backend's own message and leaves the device
 * pending, so the admin can simply try the next code.
 */
export default function TOTPConfirmForm({ deviceId, onConfirmed }: TOTPConfirmFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);
    try {
      await confirm2FA(deviceId, code);
      // Never keep the code in component state after it is used.
      setCode("");
      onConfirmed();
    } catch (err) {
      setError(
        err instanceof APIError
          ? err.message
          : "No se pudo confirmar el dispositivo. Inténtalo de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Paso 2 — Confirmá el código
        </CardTitle>
        <CardDescription>
          Ingresá el código de 6 dígitos que muestra tu app para activar el dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="totp-confirm-code" className="text-xs font-medium text-foreground">
              Código de 6 dígitos
            </label>
            <input
              id="totp-confirm-code"
              type="text"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={fieldClasses}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-error/10 px-3 py-2 text-xs text-error"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full bg-primary text-on-primary hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Confirmando…" : "Confirmar dispositivo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
