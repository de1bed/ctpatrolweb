import "server-only";

import { z } from "zod";

import { modeloVision, openai } from "./cliente";
import {
  instruccionesDeCampo,
  type ObjetivoDocumento,
} from "./campos-documento";

/**
 * Lectura de UN campo del documento que el inspector está llenando.
 * Pedir los cuatro números en la misma foto mezcla datos de hojas distintas.
 */

export const esquemaLectura = z.object({
  valor: z.string().nullable(),
  dudoso: z.boolean(),
  problema: z.string().nullable(),
});

export type LecturaCampo = z.infer<typeof esquemaLectura>;

export type ResultadoExtraccion =
  | { ok: true; datos: LecturaCampo }
  | { ok: false; error: string };

export async function extraerDeDocumento(
  imagenBase64: string,
  mimeType: string,
  objetivo: ObjetivoDocumento
): Promise<ResultadoExtraccion> {
  try {
    const respuesta = await openai().chat.completions.create({
      model: modeloVision(),
      temperature: 0,
      max_tokens: 200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lectura_campo",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["valor", "dudoso", "problema"],
            properties: {
              valor: { type: ["string", "null"] },
              dudoso: { type: "boolean" },
              problema: { type: ["string", "null"] },
            },
          },
        },
      },
      messages: [
        { role: "system", content: instruccionesDeCampo(objetivo) },
        {
          role: "user",
          content: [
            { type: "text", text: "Lee solo ese campo en esta imagen." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imagenBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content;
    if (!contenido) return { ok: false, error: "El modelo no devolvió contenido." };

    const validado = esquemaLectura.safeParse(JSON.parse(contenido));
    if (!validado.success) {
      return { ok: false, error: "La respuesta llegó con una forma inesperada." };
    }

    return { ok: true, datos: validado.data };
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) {
      const status = (e as { status?: number }).status;
      if (status === 401) return { ok: false, error: "La configuración de IA no es válida." };
      if (status === 429) return { ok: false, error: "El servicio está saturado. Intenta en un momento." };
      if (status && status >= 500) return { ok: false, error: "El servicio de IA no está disponible." };
    }
    return { ok: false, error: "No se pudo leer el documento." };
  }
}
