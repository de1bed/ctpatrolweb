"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { extraerDeDocumento, type Extraccion } from "@/lib/ai/ocr";
import { isOpenAiConfigured } from "@/lib/env";

/**
 * Escaneo de un documento con la cámara.
 *
 * A diferencia de la evidencia de inspección, la foto del documento NO se
 * guarda: solo se usa para extraer los cuatro números y se descarta. Una
 * factura lleva precios, condiciones comerciales y datos del cliente final
 * que no tienen por qué quedarse en el expediente de una inspección de
 * seguridad — y lo que no se guarda no se puede filtrar.
 *
 * Por eso la imagen viaja en el cuerpo de la petición y no por Storage.
 */

const esquema = z.object({
  // Tope de 8 MB en base64 (~6 MB de imagen). Suficiente para una hoja
  // legible y un límite duro contra una petición inflada a propósito.
  imagenBase64: z.string().min(100).max(8_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type ResultadoOcr =
  | { ok: true; datos: Extraccion }
  | { ok: false; error: string };

export async function escanearDocumento(entrada: unknown): Promise<ResultadoOcr> {
  // Sesión obligatoria: esta ruta gasta dinero por llamada.
  await requerirSesion();

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error: "El escaneo de documentos todavía no está configurado en este entorno.",
    };
  }

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, error: "La imagen no tiene un formato válido." };
  }

  const resultado = await extraerDeDocumento(
    validado.data.imagenBase64,
    validado.data.mimeType
  );

  if (!resultado.ok) return { ok: false, error: resultado.error };
  return { ok: true, datos: resultado.datos };
}
