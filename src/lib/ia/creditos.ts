import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/server";

/** Un análisis de foto o un escaneo de documento. */
export const COSTO_CREDITO_IA = 1;

export type EstadoIa = {
  plataforma: boolean;
  activa: boolean;
  creditos: number;
  /** Las dos llaves encendidas y al menos un crédito. */
  disponible: boolean;
};

export function estadoIa(cuenta: {
  ia_plataforma: boolean;
  ia_activa: boolean;
  creditos_ia: number;
}): EstadoIa {
  const plataforma = cuenta.ia_plataforma;
  const activa = cuenta.ia_activa;
  const creditos = cuenta.creditos_ia;
  return {
    plataforma,
    activa,
    creditos,
    disponible: plataforma && activa && creditos >= COSTO_CREDITO_IA,
  };
}

const MENSAJES: Record<string, string> = {
  IA_NO_AUTORIZADA: "El análisis con IA no está autorizado para esta empresa.",
  IA_APAGADA: "El administrador de la empresa apagó el análisis con IA.",
  IA_SIN_CREDITOS: "Esta empresa no tiene créditos de IA.",
  IA_SIN_SESION: "No hay una sesión válida para usar la IA.",
};

export function mensajeCredito(error: string): string {
  for (const [codigo, texto] of Object.entries(MENSAJES)) {
    if (error.includes(codigo)) return texto;
  }
  return "No se pudo descontar el crédito de IA.";
}

/** Descuenta 1 crédito. Devuelve el id del movimiento para poder reembolsarlo. */
export async function consumirCredito(opts: {
  nota: string;
  inspectionId?: string;
  mediaId?: string;
}): Promise<{ ok: true; movimientoId: string } | { ok: false; error: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consumir_credito_ia", {
    p_nota: opts.nota,
    p_inspection_id: opts.inspectionId,
    p_media_id: opts.mediaId,
  });

  if (error || !data) {
    return { ok: false, error: mensajeCredito(error?.message ?? "") };
  }
  return { ok: true, movimientoId: data };
}

/** Devuelve el crédito si OpenAI falló. Solo el servidor puede llamarla. */
export async function reembolsarCredito(movimientoId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;
  await admin.rpc("reembolsar_credito_ia", { p_movimiento: movimientoId });
}
