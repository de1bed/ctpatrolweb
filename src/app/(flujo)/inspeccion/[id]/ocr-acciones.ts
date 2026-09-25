"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { extraerDeDocumento, type Extraccion } from "@/lib/ai/ocr";
import { LADO_VISION_DOCUMENTO, prepararParaVision } from "@/lib/ai/imagen";
import { isOpenAiConfigured } from "@/lib/env";
import { consumirCredito, reembolsarCredito } from "@/lib/ia/creditos";

/**
 * Escaneo de un documento con la cámara.
 *
 * Esta petición solo extrae los números. La foto en sí la archiva el
 * teléfono como evidencia (fase documentos), con fecha y ubicación.
 * La imagen del escaneo viaja en el cuerpo para leerla; no se queda en
 * esta ruta.
 */

const esquema = z.object({
  // Tope de 8 MB en base64 (~6 MB de imagen). Suficiente para una hoja
  // legible y un límite duro contra una petición inflada a propósito.
  imagenBase64: z.string().min(100).max(8_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type ResultadoOcr =
  | { ok: true; datos: Extraccion }
  | { ok: false; error: string; codigo?: "no_configurado" | "imagen_invalida" };

export async function escanearDocumento(entrada: unknown): Promise<ResultadoOcr> {
  // Sesión obligatoria: esta ruta gasta dinero por llamada.
  await requerirSesion();

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "El escaneo con IA no está configurado. Se intentará leer el documento en el dispositivo.",
      codigo: "no_configurado",
    };
  }

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return {
      ok: false,
      error:
        "La imagen no tiene un formato válido. Usa JPEG o PNG, o toma una foto nueva con la cámara.",
      codigo: "imagen_invalida",
    };
  }

  const cobro = await consumirCredito({ nota: "Escaneo de documento" });
  if (!cobro.ok) return { ok: false, error: cobro.error };

  const crudo = Buffer.from(validado.data.imagenBase64, "base64");
  const imagen = await prepararParaVision(
    crudo,
    validado.data.mimeType,
    LADO_VISION_DOCUMENTO
  );

  const resultado = await extraerDeDocumento(imagen.base64, imagen.mimeType);

  if (!resultado.ok) {
    await reembolsarCredito(cobro.movimientoId);
    return { ok: false, error: resultado.error };
  }
  return { ok: true, datos: resultado.datos };
}
