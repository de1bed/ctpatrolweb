"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { enviarReporteAlCerrar } from "@/lib/email/reporte-cierre";
import { ESQUEMAS, PROYECCIONES } from "@/lib/inspection/esquemas";
import { FASES_POR_ID } from "@/lib/inspection/fases";
import { construirFlujo, faseIdDeClave, puedeAbrir } from "@/lib/inspection/flujo";
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
  datosCrudos: unknown,
  /** Segundos que el inspector pasó en esta pantalla. */
  segundosEnPantalla = 0
): Promise<ResultadoGuardado> {
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const faseId = faseIdDeClave(clavePaso);
  const fase = FASES_POR_ID.get(faseId);
  if (!fase) return { ok: false, error: "Esa fase no existe." };

  // ── Estado actual ─────────────────────────────────────────────────────────
  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, status, transport_type, is_full, data, progress, timings, started_at")
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
  const esquema = ESQUEMAS[faseId] as z.ZodTypeAny;
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

  const proyeccion = PROYECCIONES[faseId];
  const columnas = proyeccion ? proyeccion(datos) : {};

  const nuevoProgreso = marcarCompletado(progreso, clavePaso);

  // Tiempo por fase. Se ACUMULA en vez de sobrescribir: si el inspector
  // vuelve a una pantalla para corregir algo, ese tiempo también es tiempo
  // que le costó la inspección, y el admin lo necesita para medir de verdad.
  const tiemposActuales =
    inspeccion.timings && typeof inspeccion.timings === "object" && !Array.isArray(inspeccion.timings)
      ? (inspeccion.timings as Record<string, number>)
      : {};

  // Tope de 2 horas por visita: si el inspector dejó la pestaña abierta toda
  // la noche, ese número no mide trabajo y contaminaría el promedio.
  const segundos = Math.min(Math.max(0, Math.round(segundosEnPantalla)), 7200);

  const nuevosTiempos = {
    ...tiemposActuales,
    [clavePaso]: (tiemposActuales[clavePaso] ?? 0) + segundos,
  };

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
      timings: nuevosTiempos as unknown as Json,
      ...(arrancando
        ? { status: "in_progress" as const, started_at: new Date().toISOString() }
        : {}),
      ...(resultado
        ? {
            status: "completed" as const,
            completed_at: new Date().toISOString(),
            passed: resultado.aprobada,
            findings_count: resultado.hallazgos,
            // Suma de los tiempos por pantalla, NO la resta entre inicio y
            // fin: esa incluiría las horas que la unidad estuvo cargando
            // durante la pausa, que no son trabajo del inspector.
            duration_seconds: Object.values(nuevosTiempos).reduce(
              (a, b) => a + (typeof b === "number" ? b : 0),
              0
            ),
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
      : {
          paso: clavePaso,
          ...(typeof datos.escalamiento === "string" && datos.escalamiento !== "ninguno"
            ? { escalamiento: datos.escalamiento, nota: datos.escalamientoNota ?? "" }
            : {}),
        }) as Json,
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
  revalidatePath(`/inspeccion/${inspeccionId}/${clavePaso}`);
  revalidatePath(`/inspeccion/${inspeccionId}/evidencia`);

  if (cerrando) {
    try {
      await enviarReporteAlCerrar(inspeccionId);
    } catch (error) {
      console.error("No se pudo enviar el reporte al cerrar", error);
    }
  }

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
