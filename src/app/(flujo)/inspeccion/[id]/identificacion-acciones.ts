"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import {
  extraerIdentificacion,
  type LecturaIdentificacion,
} from "@/lib/ai/identificacion";
import { LADO_VISION_DOCUMENTO, prepararParaVision } from "@/lib/ai/imagen";
import { isOpenAiConfigured } from "@/lib/env";
import { consumirCredito, reembolsarCredito } from "@/lib/ia/creditos";
import { createClient } from "@/lib/supabase/server";

/**
 * Lectura con IA de la licencia del conductor o de las placas.
 *
 * Es opcional por diseño: la foto ya quedó guardada como evidencia antes de
 * llegar aquí, y el inspector puede capturar los datos a mano. Esta ruta solo
 * se llama cuando el inspector pide la lectura.
 *
 * La imagen llega de una de dos formas:
 *   imagenBase64  la foto recién tomada, que todavía vive en el teléfono.
 *   mediaId       una foto ya subida (el inspector volvió a la pantalla
 *                 después de que el teléfono liberó su copia local).
 */

const esquema = z
  .object({
    inspeccionId: z.string().uuid(),
    tipo: z.enum(["licencia", "placas"]),
    // Tope de 8 MB en base64, igual que el escaneo de documentos.
    imagenBase64: z.string().min(100).max(8_000_000).optional(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    mediaId: z.string().uuid().optional(),
  })
  .refine((d) => Boolean(d.imagenBase64) !== Boolean(d.mediaId), {
    message: "Manda la imagen o el id de la evidencia, no ambos.",
  });

export type ResultadoLecturaIdentificacion =
  | { ok: true; datos: LecturaIdentificacion }
  | { ok: false; error: string };

export async function leerIdentificacion(
  entrada: unknown
): Promise<ResultadoLecturaIdentificacion> {
  // Sesión obligatoria: esta ruta gasta dinero por llamada.
  await requerirSesion();

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error: "La lectura con IA no está configurada. Captura los datos a mano.",
    };
  }

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return {
      ok: false,
      error: "La imagen no tiene un formato válido. Toma la foto de nuevo.",
    };
  }
  const d = validado.data;

  const supabase = await createClient();

  // ── Imagen ─────────────────────────────────────────────────────────────
  // Se resuelve ANTES de cobrar: si la foto no se puede leer, no hay gasto.
  let crudo: Buffer;
  let mimeType: string;

  if (d.mediaId) {
    // RLS decide si esta evidencia es visible para el usuario.
    const { data: media } = await supabase
      .from("inspection_media")
      .select("storage_path, mime_type")
      .eq("id", d.mediaId)
      .eq("inspection_id", d.inspeccionId)
      .maybeSingle();

    if (!media?.storage_path) {
      return { ok: false, error: "La foto todavía no se ha subido." };
    }
    if (media.mime_type && !media.mime_type.startsWith("image/")) {
      return { ok: false, error: "La lectura con IA solo aplica a fotos." };
    }

    const { data: archivo, error } = await supabase.storage
      .from("inspection-media")
      .download(media.storage_path);
    if (error || !archivo) return { ok: false, error: "No se pudo leer la foto." };

    crudo = Buffer.from(await archivo.arrayBuffer());
    mimeType = media.mime_type ?? "image/jpeg";
  } else {
    crudo = Buffer.from(d.imagenBase64!, "base64");
    mimeType = d.mimeType ?? "image/jpeg";
  }

  const cobro = await consumirCredito({
    nota: d.tipo === "licencia" ? "Lectura de licencia" : "Lectura de placas",
    inspectionId: d.inspeccionId,
  });
  if (!cobro.ok) return { ok: false, error: cobro.error };

  try {
    const imagen = await prepararParaVision(crudo, mimeType, LADO_VISION_DOCUMENTO);
    const resultado = await extraerIdentificacion(d.tipo, imagen.base64, imagen.mimeType);

    if (!resultado.ok) {
      await reembolsarCredito(cobro.movimientoId);
      return { ok: false, error: resultado.error };
    }
    return { ok: true, datos: resultado.datos };
  } catch {
    // Una imagen corrupta revienta en sharp antes de llegar al modelo: el
    // crédito no se usó, se devuelve.
    await reembolsarCredito(cobro.movimientoId);
    return { ok: false, error: "No se pudo procesar la imagen." };
  }
}
