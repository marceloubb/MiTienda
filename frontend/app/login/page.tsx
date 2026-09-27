"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, LogIn, ShieldCheck, ShoppingBag } from "lucide-react";
import {
  APIError,
  clearTOTPCode,
  getProfile,
  isTOTPCodeRequired,
  login as apiLogin,
  setTOTPCode,
  type User,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const inputClass =
  "w-full rounded-xl border border-control-border bg-surface-container-lowest px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40";

const CREDENTIALS_ERROR =
  "Credenciales inválidas. Revisa tu usuario y contraseña e inténtalo de nuevo.";

// Second step of the login flow, shown only when the backend answers 401 with
// code === 'totp_required' (a confirmed TOTP device plus DJANGO_2FA_ENFORCED
// on). The session is NOT established at this point: no profile, no cart, no
// role-based rendering — the code is verified by re-probing the profile with
// the `X-TOTP` header before the user is logged in.
function TOTPChallengeStep({
  username,
  onVerified,
  onCancel,
}: {
  username: string;
  onVerified: (profile: User) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Stored first so the request below carries it as X-TOTP.
      setTOTPCode(code);
      // This probe IS the verification: a 200 here means the backend accepted
      // the code, and the returned profile is the established session.
      const profile = await getProfile({ totp: code });
      onVerified(profile);
    } catch (err) {
      // A wrong or expired code comes back as the same totp_required 401:
      // drop it from memory so it is never attached to a later request, and
      // keep the challenge open for another attempt.
      clearTOTPCode();
      if (isTOTPCodeRequired(err)) {
        setError("El código no es válido. Revisa el de tu app y vuelve a intentarlo.");
      } else {
        setError(
          err instanceof APIError
            ? err.message
            : "No se pudo verificar el código. Inténtalo de nuevo."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label htmlFor="totp-code" className="mb-1.5 block text-sm font-medium text-foreground">
          Código de verificación
        </label>
        <input
          id="totp-code"
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
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ingresa el código de 6 dígitos de tu app de autenticación para {username}.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={isLoading || code.length !== 6} className="w-full">
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

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Usar otra cuenta
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Set only when the password step succeeded but the session is still gated.
  const [needsTOTP, setNeedsTOTP] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiLogin(username, password);

      // Probe the session: this is the request that surfaces the 2FA gate.
      // Users without a confirmed device (or with enforcement off) never see
      // the challenge and are logged in straight away.
      try {
        const profile = await getProfile();
        login(profile);
        router.push("/");
        return;
      } catch (probeError) {
        if (!isTOTPCodeRequired(probeError)) throw probeError;
        setNeedsTOTP(true);
      }
    } catch {
      setError(CREDENTIALS_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  function handleTOTPVerified(profile: User) {
    // The challenge's probe returned a real profile, so the second factor is
    // accepted and the session is established: hand it to the auth context.
    login(profile);
    router.push("/");
  }

  if (needsTOTP) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="gap-6 p-8">
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="size-7 text-primary" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-foreground">
                Verificación en dos pasos
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu cuenta tiene 2FA activo. Confirma tu identidad para continuar.
              </p>
            </div>

            <TOTPChallengeStep
              username={username}
              onVerified={handleTOTPVerified}
              onCancel={() => {
                clearTOTPCode();
                setPassword("");
                setNeedsTOTP(false);
                setError("");
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="gap-6 p-8">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShoppingBag className="size-7 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Accede a tu cuenta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}