import "server-only";

import { CorreoReporte } from "@/emails/reporte";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { enviarCorreo } from "./enviar";

/**
 * Manda el resumen al cerrar, solo si el inspector tiene correos de copia.
 * Un fallo aquí no revierte el cierre: el expediente ya quedó.
 */
export async function enviarReporteAlCerrar(inspeccionId: string) {
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select(
      "id, display_id, customer_name, passed, verification_token, assigned_to, created_by, company_account_id"
    )
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!inspeccion) return;

  const inspectorId = inspeccion.assigned_to ?? inspeccion.created_by;
  if (!inspectorId) return;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("report_emails")
    .eq("id", inspectorId)
    .maybeSingle();

  const destinos = (perfil?.report_emails ?? []).filter(Boolean);
  if (destinos.length === 0) return;

  const { data: cuenta } = await supabase
    .from("company_accounts")
    .select("name")
    .eq("id", inspeccion.company_account_id)
    .maybeSingle();

  const urlVerificacion = inspeccion.verification_token
    ? `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/evidencia/${inspeccion.verification_token}`
    : null;

  const resultado = inspeccion.passed ? "aprobada" : "rechazada";

  await enviarCorreo({
    to: destinos,
    subject: `Inspección C-TPAT ${inspeccion.display_id} · ${resultado === "aprobada" ? "Aprobada" : "Rechazada"}`,
    react: (
      <CorreoReporte
        folio={inspeccion.display_id}
        empresa={cuenta?.name ?? "CTPatrol"}
        transportista={inspeccion.customer_name}
        resultado={resultado}
        urlVerificacion={urlVerificacion}
      />
    ),
    idempotencyKey: `reporte-cierre/${inspeccion.id}`,
  });
}
