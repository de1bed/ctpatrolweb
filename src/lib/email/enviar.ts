import "server-only";

import { Resend } from "resend";
import type { ReactElement } from "react";

import { isResendConfigured, resendEnv } from "@/lib/env";

export type ResultadoCorreo = { ok: true } | { ok: false; error: string };

/**
 * Envío transaccional.
 *
 * Nunca lanza: un fallo de correo no debe tumbar el alta de un inspector ni
 * el cierre de una inspección. El llamador decide si avisa o sigue.
 */
export async function enviarCorreo(opts: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  idempotencyKey: string;
}): Promise<ResultadoCorreo> {
  if (!isResendConfigured()) {
    return { ok: false, error: "El correo transaccional no está configurado." };
  }

  const destinos = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  if (destinos.length === 0) {
    return { ok: false, error: "Falta el destinatario." };
  }

  const { RESEND_API_KEY, RESEND_FROM } = resendEnv();
  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send(
    {
      from: RESEND_FROM,
      to: destinos,
      subject: opts.subject,
      react: opts.react,
    },
    { idempotencyKey: opts.idempotencyKey.slice(0, 256) }
  );

  if (error) {
    console.error("No se pudo enviar el correo", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
