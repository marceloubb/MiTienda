"use client";

import { useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Agrupa el secreto Base32 de a 4 caracteres para leerlo y tipearlo a mano sin
// perder de vista dónde termina cada grupo.
function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

interface TOTPSecretCardProps {
  /** Base32 secret exactly as the backend issued it (unformatted). */
  secret: string;
  /** `otpauth://totp/...` URI — encoded into the QR code shown below. */
  provisioningUri: string;
}

/**
 * Device material for a pending enrollment. The secret is the authoritative
 * artifact and is always shown in full: the admin can type it into any
 * authenticator app that accepts manual keys, so enrollment is never blocked
 * on the QR panel below.
 */
export default function TOTPSecretCard({ secret, provisioningUri }: TOTPSecretCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // Copy the raw Base32 key, never the spaced display form.
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      sileo.success({ title: "Secreto copiado", description: "Pégalo en tu app de autenticación." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      sileo.error({
        title: "No se pudo copiar",
        description: "Copiá el código a mano desde el recuadro.",
      });
    }
  }

  return (
    <Card className="rounded-2xl ring-outline-variant/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4 text-primary" />
          Paso 1 — Registrá tu dispositivo
        </CardTitle>
        <CardDescription>
          Agregá este secreto a tu app de autenticación (Google Authenticator, Microsoft
          Authenticator, 1Password) y luego confirmá con un código.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {provisioningUri && (
          <div className="flex flex-col items-center gap-3">
            {/* Rendered entirely client-side from the provisioning URI: the TOTP
                secret must never reach a third-party QR image service. Colors are
                the literal on-surface/surface tokens rather than CSS vars because
                a var that fails to resolve leaves the SVG fill invalid and the
                code unscannable. Level M plus the spec's 4-module quiet zone keeps
                it readable on a phone camera. */}
            <div className="rounded-2xl border border-outline-variant bg-white p-3">
              <QRCodeSVG
                value={provisioningUri}
                size={200}
                level="M"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#131b2e"
                title="Código QR para registrar el dispositivo TOTP"
              />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <QrCode className="size-3.5 shrink-0" aria-hidden="true" />
              Escaneá el código con tu app, o usá la clave manual de abajo.
            </p>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Clave manual (Base32)</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="select-all break-all rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-mono text-sm tracking-widest text-foreground">
            {formatSecret(secret)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
