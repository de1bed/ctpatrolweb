"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { ESQUEMAS, PROYECCIONES } from "@/lib/inspection/esquemas";
import { FASES_POR_ID, type FaseId } from "@/lib/inspection/fases";
import { construirFlujo, puedeAbrir } from "@/lib/inspection/flujo";
import { leerProgreso, marcarCompletado } from "@/lib/inspection/progreso";
import { calcularResultado } from "@/lib/inspection/resultado";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type ResultadoGuardado =
  | { ok: true; siguiente: string | null }
  | { ok: false; error: string; campos?: Record<string, string> };

/**
 * Guarda una fase de la inspección.
 *
 * Es el único camino por el que entran datos al expediente, así que aquí se
 * concentran todas las validaciones. El orden importa:
 *
 *   1. ¿Hay sesión?
 *   2. ¿Esta inspección existe y este usuario puede tocarla?  (lo resuelve RLS)
 *   3. ¿Está abierta, o ya se cerró?
 *   4. ¿Esta fase aplica a esta unidad?
 *   5. ¿Le toca abrirla ahora, o se está brincando el flujo guiado?
 *   6. ¿Los datos tienen la forma correcta?
 *
 * Nada de esto se delega al cliente. El formulario valida para ayudar al
 * inspector; el servidor valida porque es lo único que de verdad cuenta.
 */
export async function guardarFase(
  inspeccionId: string,
  clavePaso: string,
  datosCrudos: unknown
): Promise<ResultadoGuardado> {
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const [faseId] = clavePaso.split("#");
  const fase = FASES_POR_ID.get(faseId as FaseId);
  if (!fase) return { ok: false, error: "Esa fase no existe." };

  // ── Estado actual ─────────────────────────────────────────────────────────
  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, status, transport_type, is_full, data, progress")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!inspeccion) {
    return { ok: false, error: "No se encontró la inspección." };
  }

  if (inspeccion.status === "completed" || inspeccion.status === "cancelled") {
    return {
      ok: false,
      error: "Esta inspección ya está cerrada y no se puede modificar.",
    };
  }

  // ── ¿La fase aplica y le toca? ────────────────────────────────────────────
  const progreso = leerProgreso(inspeccion.progress);
  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: progreso.completados,
  });

  if (!flujo.pasos.some((p) => p.clave === clavePaso)) {
    return {
      ok: false,
      error: "Esa fase no aplica a este tipo de transporte.",
    };
  }

  if (!puedeAbrir(flujo, clavePaso)) {
    return {
      ok: false,
      error: "Todavía no puedes abrir esa fase. Termina primero las obligatorias.",
    };
  }

  // ── Validación de los datos ───────────────────────────────────────────────
  const esquema = ESQUEMAS[faseId as FaseId] as z.ZodTypeAny;
  const validado = esquema.safeParse(datosCrudos ?? {});

  if (!validado.success) {
    // Se devuelven los errores por campo para poder pintarlos junto al input
    // correspondiente en vez de un mensaje genérico arriba del formulario.
    const campos: Record<string, string> = {};
    for (const issue of validado.error.issues) {
      const campo = issue.path.join(".");
      if (campo && !campos[campo]) campos[campo] = issue.message;
    }
    return {
      ok: false,
      error: "Revisa los datos marcados.",
      campos,
    };
  }

  const datos = validado.data as Record<string, unknown>;

  // ── Escritura ─────────────────────────────────────────────────────────────
  const dataActual =
    inspeccion.data && typeof inspeccion.data === "object" && !Array.isArray(inspeccion.data)
      ? (inspeccion.data as Record<string, Json>)
      : {};

  // La clave del paso (no la de la fase) es lo que indexa: en un full,
  // "sellos#1" y "sellos#2" son capturas distintas.
  const nuevaData = { ...dataActual, [clavePaso]: datos as Json };

  const proyeccion = PROYECCIONES[faseId as FaseId];
  const columnas = proyeccion ? proyeccion(datos) : {};

  const nuevoProgreso = marcarCompletado(progreso, clavePaso);

  // Primera captura: la inspección pasa de "asignada" a "en curso".
  const arrancando =
    inspeccion.status === "assigned" || inspeccion.status === "draft";

  // Las firmas cierran el expediente. A partir de aquí RLS impide que el
  // inspector lo siga editando: la política `inspections_update_own` excluye
  // los estados 'completed' y 'cancelled'.
  const cerrando = faseId === "firmas";
  const resultado = cerrando ? calcularResultado(nuevaData as Json) : null;

  const { error } = await supabase
    .from("inspections")
    .update({
      ...columnas,
      data: nuevaData as Json,
      progress: nuevoProgreso as unknown as Json,
      ...(arrancando
        ? { status: "in_progress" as const, started_at: new Date().toISOString() }
        : {}),
      ...(resultado
        ? {
            status: "completed" as const,
            completed_at: new Date().toISOString(),
            passed: resultado.aprobada,
            findings_count: resultado.hallazgos,
          }
        : {}),
    })
    .eq("id", inspeccionId);

  if (error) {
    console.error("Error al guardar la fase", { clavePaso, error });
    return {
      ok: false,
      error: "No se pudo guardar. Revisa tu conexión e intenta de nuevo.",
    };
  }

  // Bitácora. Es append-only y es lo que permite reconstruir qué pasó si
  // alguien reclama el resultado de una inspección.
  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: cerrando ? "completed" : "phase_completed",
    payload: (cerrando
      ? { paso: clavePaso, aprobada: resultado?.aprobada, hallazgos: resultado?.hallazgos }
      : { paso: clavePaso }) as Json,
  });

  // Se recalcula el flujo YA con esta fase marcada: cambiar el tipo de
  // transporte reescribe qué sigue, así que no sirve el cálculo de arriba.
  const flujoFinal = construirFlujo({
    tipoTransporte:
      (columnas.transport_type as typeof inspeccion.transport_type) ??
      inspeccion.transport_type,
    esFull: (columnas.is_full as boolean) ?? inspeccion.is_full,
    completados: nuevoProgreso.completados,
  });

  revalidatePath(`/inspeccion/${inspeccionId}`);

  return { ok: true, siguiente: flujoFinal.siguiente?.clave ?? null };
}

/**
 * Pausa la inspección.
 *
 * Solo se permite con las secciones críticas terminadas: al retomarla hay que
 * poder reconstruir qué pantallas le tocan, y eso depende del tipo de
 * transporte.
 */
export async function pausarInspeccion(
  inspeccionId: string
): Promise<ResultadoGuardado> {
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, status, transport_type, is_full, progress")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!inspeccion) return { ok: false, error: "No se encontró la inspección." };

  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: leerProgreso(inspeccion.progress).completados,
  });

  if (!flujo.puedePausar) {
    return {
      ok: false,
      error:
        "Termina las secciones obligatorias antes de pausar. Sin ellas no se puede saber qué falta al retomar.",
    };
  }

  const { error } = await supabase
    .from("inspections")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", inspeccionId);

  if (error) return { ok: false, error: "No se pudo pausar." };

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: "paused",
  });

  revalidatePath(`/inspeccion/${inspeccionId}`);
  return { ok: true, siguiente: null };
}

export async function reanudarInspeccion(
  inspeccionId: string
): Promise<ResultadoGuardado> {
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspections")
    .update({ status: "in_progress", paused_at: null })
    .eq("id", inspeccionId);

  if (error) return { ok: false, error: "No se pudo reanudar." };

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: "resumed",
  });

  revalidatePath(`/inspeccion/${inspeccionId}`);
  return { ok: true, siguiente: null };
}
