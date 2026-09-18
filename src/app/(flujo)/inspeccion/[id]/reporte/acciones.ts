"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { enviarResumenReporte } from "@/lib/email/mensajes";
import { parsearCorreos } from "@/lib/email/parsear";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, display_id, customer_name, passed, verification_token, status")
    .eq("id", datos.data.inspeccionId)
    .maybeSingle();

  if (!inspeccion || inspeccion.status !== "completed") {
    return { error: "Esa inspección no está cerrada.", enviado: false };
  }

  const urlVerificacion = inspeccion.verification_token
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
