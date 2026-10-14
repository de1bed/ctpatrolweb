"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extraerDeDocumento, type LecturaCampo } from "@/lib/ai/ocr";
import { LADO_VISION_DOCUMENTO, prepararParaVision } from "@/lib/ai/imagen";
import { isOpenAiConfigured } from "@/lib/env";
import { textoObjetivo, type ObjetivoDocumento } from "@/lib/ai/campos-documento";
import { anotarUsoIa } from "@/lib/ia/anotar";
import { consumirCredito, reembolsarCredito } from "@/lib/ia/creditos";

/**
 * Escaneo de un documento con la cámara.
 *
 * Lee un solo campo del documento: el que el inspector está llenando.
 * La foto la archiva el teléfono como evidencia de ese campo.
 * La imagen del escaneo viaja en el cuerpo para leerla; no se queda en
 * esta ruta.
 */

const esquema = z.object({
  imagenBase64: z.string().min(100).max(8_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  campo: z.enum(["factura", "billOfLading", "pedimento", "sellosFiscales", "otro"]),
  titulo: z.string().trim().max(80).optional(),
  inspeccionId: z.string().uuid().optional(),
});

export type ResultadoOcr =
  | { ok: true; datos: LecturaCampo; creditos: number | null }
  | { ok: false; error: string; codigo?: "no_configurado" | "imagen_invalida" };

export async function escanearDocumento(entrada: unknown): Promise<ResultadoOcr> {
  // Sesión obligatoria: esta ruta gasta dinero por llamada.
  const sesion = await requerirSesion();

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

  if (validado.data.campo === "otro" && !validado.data.titulo) {
    return { ok: false, error: "Escribe el título del documento antes de escanearlo.", codigo: "imagen_invalida" };
  }

  const objetivoLectura: ObjetivoDocumento =
    validado.data.campo === "otro"
      ? { campo: "otro", titulo: validado.data.titulo ?? "" }
      : { campo: validado.data.campo };
  const etiqueta = textoObjetivo(objetivoLectura).etiqueta;

  const cobro = await consumirCredito({
    nota: `Escaneo de ${etiqueta || "documento"}`,
    inspectionId: validado.data.inspeccionId,
  });
  if (!cobro.ok) return { ok: false, error: cobro.error };

  const crudo = Buffer.from(validado.data.imagenBase64, "base64");
  const imagen = await prepararParaVision(
    crudo,
    validado.data.mimeType,
    LADO_VISION_DOCUMENTO
  );

  const resultado = await extraerDeDocumento(
    imagen.base64,
    imagen.mimeType,
    objetivoLectura
  );

  if (!resultado.ok) {
    await reembolsarCredito(cobro.movimientoId);
    return { ok: false, error: resultado.error };
  }

  if (validado.data.inspeccionId) {
    await anotarUsoIa({
      inspectionId: validado.data.inspeccionId,
      actorId: sesion.userId,
      event: "ai_ocr",
      payload: {
        uso: "documento",
        campo: validado.data.campo,
        etiqueta,
        resultado: resultado.datos,
      },
    });
  }

  const supabase = await createClient();
  const { data: cuenta } = await supabase
    .from("company_accounts")
    .select("creditos_ia")
    .eq("id", sesion.companyAccountId)
    .maybeSingle();

  return { ok: true, datos: resultado.datos, creditos: cuenta?.creditos_ia ?? null };
}
