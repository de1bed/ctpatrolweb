"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Registro de evidencia ya subida a Storage.
 *
 * El archivo lo sube el navegador directo a Supabase Storage —las políticas
 * de la migración 0004 lo permiten dentro de la carpeta de su cuenta—. Este
 * paso solo crea la fila que lo describe.
 *
 * Se hace en dos tiempos a propósito: pasar el binario por el servidor
 * duplicaría el tráfico de cada foto, y en una red de patio eso se nota.
 */

const esquema = z.object({
  inspeccionId: z.string().uuid(),
  clientId: z.string().min(1).max(64),
  tipo: z.enum(["foto", "video"]).default("foto"),
  duracionSegundos: z.number().nonnegative().nullable().optional(),
  paso: z.string().min(1).max(64),
  puntoClave: z.string().max(120).nullable(),
  puntoNombre: z.string().max(200).nullable(),
  storagePath: z.string().min(1).max(500),
  mimeType: z.string().max(100),
  tamanoBytes: z.number().int().nonnegative(),
  ancho: z.number().int().positive(),
  alto: z.number().int().positive(),
  capturadaEn: z.string().datetime(),
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
});

export type ResultadoRegistro =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function registrarEvidencia(
  entrada: unknown
): Promise<ResultadoRegistro> {
  const sesion = await requerirSesion();

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, error: "Datos de evidencia inválidos." };
  }
  const d = validado.data;

  // La ruta tiene que empezar con la carpeta de SU cuenta. Sin esta
  // comprobación, un cliente manipulado podría registrar una fila apuntando
  // a la carpeta de otra empresa.
  if (!d.storagePath.startsWith(`${sesion.companyAccountId}/`)) {
    return { ok: false, error: "Ruta de archivo no permitida." };
  }

  const supabase = await createClient();

  // upsert por (inspection_id, client_id): si un reintento sube dos veces la
  // misma foto, se actualiza la fila en lugar de duplicarla.
  const { data, error } = await supabase
    .from("inspection_media")
    .upsert(
      {
        inspection_id: d.inspeccionId,
        company_account_id: sesion.companyAccountId,
        kind: d.tipo === "video" ? ("video" as const) : ("photo" as const),
        duration_seconds: d.duracionSegundos ?? null,
        phase: d.paso,
        point_key: d.puntoClave,
        point_label: d.puntoNombre,
        client_id: d.clientId,
        storage_path: d.storagePath,
        mime_type: d.mimeType,
        size_bytes: d.tamanoBytes,
        width: d.ancho,
        height: d.alto,
        captured_at: d.capturadaEn,
        latitude: d.latitud,
        longitude: d.longitud,
        upload_status: "uploaded" as const,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "inspection_id,client_id" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("No se pudo registrar la evidencia", error);
    return { ok: false, error: "No se pudo registrar la evidencia." };
  }

  if (data?.id) return { ok: true, id: data.id };

  // RLS a veces entrega el upsert sin fila; la buscamos por la llave única.
  const { data: existente } = await supabase
    .from("inspection_media")
    .select("id")
    .eq("inspection_id", d.inspeccionId)
    .eq("client_id", d.clientId)
    .maybeSingle();

  if (!existente?.id) {
    return { ok: false, error: "No se pudo registrar la evidencia." };
  }

  return { ok: true, id: existente.id };
}
