import "server-only";

import { isResendConfigured } from "@/lib/env";
import { tryCreateAdminClient } from "@/lib/supabase/server";

import { enviarVerificacion } from "./mensajes";
import type { ResultadoCorreo } from "./enviar";

function metadatoTexto(
  metadata: Record<string, unknown> | undefined,
  clave: string
): string {
  const valor = metadata?.[clave];
  return typeof valor === "string" ? valor : "";
}

/**
 * Genera un código de un solo uso con la API de admin de Auth y lo manda
 * por Resend. Sin las dos cosas no hay forma de probar que el correo es suyo.
 *
 * Usa `invite` a propósito: el usuario ya existe (lo creó el RPC) y aún no
 * confirmó. `signup` exige la contraseña otra vez; `magiclink` no confirma
 * a quien sigue sin verificar.
 */
export function puedeEnviarVerificacion(): boolean {
  return isResendConfigured() && Boolean(tryCreateAdminClient());
}

export async function enviarCodigoVerificacion(opts: {
  email: string;
  nombre?: string;
  empresa?: string;
}): Promise<ResultadoCorreo> {
  const admin = tryCreateAdminClient();
  if (!isResendConfigured() || !admin) {
    return { ok: false, error: "El correo de verificación no está configurado." };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: opts.email,
  });

  const codigo = data?.properties?.email_otp;
  if (error || !codigo) {
    return {
      ok: false,
      error: error?.message ?? "No se pudo generar el código.",
    };
  }

  const metadata = data.user?.user_metadata as Record<string, unknown> | undefined;

  return enviarVerificacion({
    to: opts.email,
    nombre: opts.nombre || metadatoTexto(metadata, "full_name"),
    empresa: opts.empresa || metadatoTexto(metadata, "company_name"),
    codigo,
  });
}

export function esCorreoYaConfirmado(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return (
    texto.includes("already registered") ||
    texto.includes("already been registered") ||
    texto.includes("email_exists")
  );
}
