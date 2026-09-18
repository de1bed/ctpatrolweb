"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin, requerirSesion } from "@/lib/auth";
import { enviarResumenReporte } from "@/lib/email/mensajes";
import { parsearCorreos } from "@/lib/email/parsear";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type EstadoEnvio = { error: string | null; enviado: boolean };

const esquema = z.object({
  inspeccionId: z.string().uuid(),
  destinatarios: z.string().min(1, "Escribe al menos un correo"),
});

export async function enviarReportePorCorreo(
  _anterior: EstadoEnvio,
  formData: FormData
): Promise<EstadoEnvio> {
  const sesion = await requerirSesion();

  const datos = esquema.safeParse({
    inspeccionId: formData.get("inspeccionId"),
    destinatarios: formData.get("destinatarios"),
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message, enviado: false };
  }

  const destinos = parsearCorreos(datos.data.destinatarios);
  if (destinos.length === 0) {
    return { error: "Ningún correo de esa lista es válido.", enviado: false };
  }
  if (destinos.length > 20) {
    return { error: "Máximo 20 destinatarios por envío.", enviado: false };
  }

  const supabase = await createClient();
  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, display_id, customer_name, passed, verification_token, verification_revoked_at, status")
    .eq("id", datos.data.inspeccionId)
    .maybeSingle();

  if (!inspeccion || inspeccion.status !== "completed") {
    return { error: "Esa inspección no está cerrada.", enviado: false };
  }

  const urlVerificacion =
    inspeccion.verification_token && !inspeccion.verification_revoked_at
      ? `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/evidencia/${inspeccion.verification_token}`
      : null;

  const resultado = inspeccion.passed ? "aprobada" : "rechazada";
  const envio = await enviarResumenReporte({
    to: destinos,
    folio: inspeccion.display_id,
    empresa: sesion.cuenta.name,
    transportista: inspeccion.customer_name,
    resultado,
    urlVerificacion,
    idempotencyKey: `reporte-manual/${inspeccion.id}/${destinos.sort().join(",")}`,
  });

  if (!envio.ok) {
    return { error: envio.error, enviado: false };
  }

  return { error: null, enviado: true };
}

export type ResultadoRevocar = { ok: true } | { ok: false; error: string };

/** Apaga el QR público. El papel sigue existiendo; el enlace ya no responde. */
export async function revocarVerificacion(
  inspeccionId: string
): Promise<ResultadoRevocar> {
  const sesion = await requerirAdmin();

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("inspections")
    .select("id, status, verification_token, verification_revoked_at")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!actual) return { ok: false, error: "No se encontró la inspección." };
  if (actual.status !== "completed") {
    return { ok: false, error: "Solo se revoca el QR de una inspección cerrada." };
  }
  if (!actual.verification_token) {
    return { ok: false, error: "Esta inspección no tiene QR." };
  }
  if (actual.verification_revoked_at) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("inspections")
    .update({ verification_revoked_at: new Date().toISOString() })
    .eq("id", inspeccionId);

  if (error) return { ok: false, error: "No se pudo revocar el QR." };

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: "verification_revoked",
    payload: {} as Json,
  });

  revalidatePath(`/inspeccion/${inspeccionId}`);
  revalidatePath(`/inspeccion/${inspeccionId}/reporte`);
  revalidatePath("/admin/inspecciones");
  return { ok: true };
}
