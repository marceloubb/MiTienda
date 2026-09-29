"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { APIError, clearTOTPCode, isTOTPCodeRequired, setTOTPCode } from "@/lib/api";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-control-border bg-surface-container-lowest px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40";

const INVALID_CODE_ERROR =
  "El código no es válido. Revisa el de tu app y vuelve a intentarlo.";
const VERIFY_FAILED_ERROR = "No se pudo verificar el código. Inténtalo de nuevo.";

/**
 * Global second-factor challenge for an ALREADY-ESTABLISHED session.
 *
 * The login page has its own inline challenge (`TOTPChallengeStep` in
 * `app/login/page.tsx`) and deliberately keeps it: at that point no session
 * exists, so the code is a step of the login form rather than an interruption
 * of one. This dialog covers the other case — a valid cookie whose TOTP code is
 * gone because the tab was reloaded, or the code window elapsed — where any
 * authenticated request can be gated with no inline resolver.
 *
 * `retry` is the rejected request's own replay, supplied by the API client. The
 * dialog never calls the API directly: it stores the code, then replays. That is
 * what lets one dialog satisfy a caller that was gated mid-flight.
 *
 * There is no cancel path on purpose. A user who cannot produce a code still has
 * `logout()`, which W5a made reachable for exactly this reason — a gated session
 * must always have a way out, and that way is sign-out, not dismissal.
 */
export default function TotpChallengeDialog({
  open,
  retry,
}: {
  open: boolean;
  retry: (() => Promise<unknown>) | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!open || !retry) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!retry) return;
    setError("");
    setIsLoading(true);

    try {
      // Stored first so the replayed request carries it as X-TOTP.
      setTOTPCode(code);
      await retry();
      // Only reached when the replay resolved, i.e. the backend accepted the
      // code. `clearTOTPCode` must NOT run here: the code now belongs to the
      // live session and every later request needs it.
    } catch (err) {
      // A wrong or expired code returns the same totp_required 401. Drop it from
      // memory so it is never attached to a later request, and keep the dialog
      // open for another attempt.
      clearTOTPCode();
      setError(isTOTPCodeRequired(err) ? INVALID_CODE_ERROR : err instanceof APIError ? err.message : VERIFY_FAILED_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="totp-challenge-title"
        className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-level-2 ring-1 ring-outline-variant"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <h2
            id="totp-challenge-title"
            className="mt-4 text-2xl font-bold text-foreground"
          >
            Verificación en dos pasos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta tiene 2FA activo. Confirma tu identidad para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl bg-error/10 p-3 text-sm text-error"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="totp-session-code"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Código de verificación
            </label>
            <input
              id="totp-session-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClass} text-center text-lg tracking-[0.4em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading || code.length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <ShieldCheck />
                Verificar código
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
