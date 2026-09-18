"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { topeLlamadas } from "@/lib/ai/cliente";
import { notaDelPunto } from "@/lib/ai/contexto";
import { LADO_VISION_PUNTO, prepararParaVision } from "@/lib/ai/imagen";
import { analizarPunto, type Analisis } from "@/lib/ai/vision";
import { isOpenAiConfigured } from "@/lib/env";
import { PUNTOS_POR_GRUPO } from "@/lib/inspection/puntos";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Análisis de evidencia con IA.
 *
 * ── Cómo está protegida esta ruta ───────────────────────────────────────────
 *
 * Es la única función de la app que gasta dinero por llamada, así que cada
 * capa de defensa está aquí a propósito:
 *
 *   Sesión        Sin usuario no se ejecuta.
 *   Pertenencia   RLS limita la evidencia a la que el usuario puede ver; si
 *                 no la ve, no la puede mandar a analizar.
 *   Idempotencia  Una foto ya analizada devuelve lo guardado sin volver a
 *                 llamar. Un doble clic no cuesta el doble.
 *   Tope          Máximo de análisis por inspección. Un bug en un bucle se
 *                 topa solo en vez de vaciar la cuenta.
 *   Validación    La respuesta del modelo se valida contra un esquema antes
 *                 de tocar la base.
 *
 * La imagen se descarga en el servidor y se manda en base64, en lugar de dar
 * a OpenAI una URL firmada. Cuesta un poco más de tráfico, pero evita que
 * exista —aunque sea un minuto— una URL con la que cualquiera pueda ver
 * evidencia de una inspección.
 */

const esquema = z.object({
  inspeccionId: z.string().uuid(),
  mediaId: z.string().uuid(),
});

export type ResultadoIa =
  | { ok: true; analisis: Analisis; yaExistia: boolean }
  | { ok: false; error: string };

export async function analizarEvidencia(entrada: unknown): Promise<ResultadoIa> {
  await requerirSesion();

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error: "El análisis con IA todavía no está configurado en este entorno.",
    };
  }

  const validado = esquema.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Petición inválida." };
  const { inspeccionId, mediaId } = validado.data;

  const supabase = await createClient();

  // RLS decide si esta evidencia es visible para el usuario. Si no lo es,
  // no hay fila y no hay análisis.
  const { data: media } = await supabase
    .from("inspection_media")
    .select("id, inspection_id, phase, point_key, point_label, storage_path, mime_type, ai_analysis")
    .eq("id", mediaId)
    .eq("inspection_id", inspeccionId)
    .maybeSingle();

  if (!media) return { ok: false, error: "No se encontró la evidencia." };

  if (media.mime_type && !media.mime_type.startsWith("image/")) {
    return { ok: false, error: "El análisis con IA solo aplica a fotos." };
  }

  // Idempotencia: ya analizada, se devuelve lo guardado.
  if (media.ai_analysis) {
    return {
      ok: true,
      analisis: media.ai_analysis as unknown as Analisis,
      yaExistia: true,
    };
  }

  if (!media.storage_path) {
    return { ok: false, error: "La foto todavía no se ha subido." };
  }

  // Tope de gasto por inspección.
  const { count } = await supabase
    .from("inspection_media")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", inspeccionId)
    .not("ai_analyzed_at", "is", null);

  if ((count ?? 0) >= topeLlamadas()) {
    return {
      ok: false,
      error: `Se alcanzó el límite de ${topeLlamadas()} análisis para esta inspección.`,
    };
  }

  // ── Descarga de la imagen ───────────────────────────────────────────────
  const { data: archivo, error: errorDescarga } = await supabase.storage
    .from("inspection-media")
    .download(media.storage_path);

  if (errorDescarga || !archivo) {
    return { ok: false, error: "No se pudo leer la foto." };
  }

  const crudo = Buffer.from(await archivo.arrayBuffer());
  const imagen = await prepararParaVision(
    crudo,
    media.mime_type ?? "image/jpeg",
    LADO_VISION_PUNTO
  );

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("data")
    .eq("id", inspeccionId)
    .maybeSingle();

  const pista = buscarPista(media.point_key);
  const notaInspector = notaDelPunto(
    inspeccion?.data,
    media.phase,
    media.point_key
  );

  const resultado = await analizarPunto({
    imagenBase64: imagen.base64,
    mimeType: imagen.mimeType,
    puntoNombre: media.point_label ?? media.point_key ?? "Punto de inspección",
    puntoPista: pista,
    notaInspector,
  });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  // ── Persistencia ────────────────────────────────────────────────────────
  await supabase
    .from("inspection_media")
    .update({
      ai_analysis: {
        ...resultado.analisis,
        modelo: resultado.modelo,
        tokens: resultado.tokens,
      } as unknown as Json,
      ai_analyzed_at: new Date().toISOString(),
    })
    .eq("id", mediaId);

  return { ok: true, analisis: resultado.analisis, yaExistia: false };
}

/** Recupera la pista del catálogo de puntos, sin importar a qué grupo pertenezca. */
function buscarPista(clave: string | null): string {
  if (!clave) return "Revisa el punto en busca de alteraciones.";

  for (const puntos of Object.values(PUNTOS_POR_GRUPO)) {
    const punto = puntos.find((p) => p.clave === clave);
    if (punto) return punto.pista;
  }
  return "Revisa el punto en busca de alteraciones.";
}
