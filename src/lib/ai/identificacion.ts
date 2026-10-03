import "server-only";

import { z } from "zod";

import { modeloVision, openai } from "./cliente";

/**
 * Lectura de identificaciones: licencia del conductor y placas de la unidad.
 *
 * Mismo criterio que los documentos: el modelo devuelve solo lo que ve, y lo
 * que duda lo marca. Un número de licencia o de placas inventado pasa por
 * bueno justo porque parece correcto.
 */

export type TipoIdentificacion = "licencia" | "placas";

export const esquemaLecturaIdentificacion = z.object({
  /** Licencia: nombre completo del titular. Placas: siempre null. */
  nombre: z.string().nullable(),
  /** Licencia: número de licencia. Placas: la matrícula. */
  numero: z.string().nullable(),
  dudoso: z.boolean(),
  problema: z.string().nullable(),
});

export type LecturaIdentificacion = z.infer<typeof esquemaLecturaIdentificacion>;

const REGLAS = `Reglas estrictas:
- Si un dato NO aparece o no se lee, devuélvelo como null. NO lo inventes.
- Si dudas de un carácter (borroso, cortado, 0/O, 1/I, 8/B), devuelve el valor
  igual y pon dudoso en true.
- Ignora el texto de fecha, hora y coordenadas que viene impreso sobre una
  franja oscura en la parte inferior de la foto: lo agrega la cámara de la
  inspección, no es parte de la identificación.
- Si la imagen está muy borrosa, muy oscura o no muestra lo que se pide, deja
  los campos en null y explica en "problema" qué pasó.
- Responde en español.`;

const INSTRUCCIONES: Record<TipoIdentificacion, string> = {
  licencia: `Lees una licencia de conducir (federal o estatal, mexicana o
extranjera) para una inspección C-TPAT.

Devuelve:
- nombre: nombre completo del titular tal como aparece, en el orden impreso.
- numero: número de licencia. Puede decir No., Número, Licencia, Folio o
  License No. No confundas con la CURP, el RFC ni la fecha de vencimiento.

Conserva guiones, letras y ceros a la izquierda del número.

${REGLAS}`,

  placas: `Lees las placas (matrícula) de un vehículo de carga para una
inspección C-TPAT: tractocamión, remolque, caja seca o contenedor.

Devuelve:
- nombre: siempre null.
- numero: la matrícula tal como aparece en la lámina, con sus guiones. Si hay
  varias láminas visibles, la más legible. No confundas con el número
  económico pintado en la unidad ni con el nombre del estado o país.

${REGLAS}`,
};

export type ResultadoIdentificacion =
  | { ok: true; datos: LecturaIdentificacion }
  | { ok: false; error: string };

export async function extraerIdentificacion(
  tipo: TipoIdentificacion,
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoIdentificacion> {
  try {
    const respuesta = await openai().chat.completions.create({
      model: modeloVision(),
      // Cero temperatura: transcribir un número no admite creatividad.
      temperature: 0,
      max_tokens: 250,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lectura_identificacion",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["nombre", "numero", "dudoso", "problema"],
            properties: {
              nombre: { type: ["string", "null"] },
              numero: { type: ["string", "null"] },
              dudoso: { type: "boolean" },
              problema: { type: ["string", "null"] },
            },
          },
        },
      },
      messages: [
        { role: "system", content: INSTRUCCIONES[tipo] },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                tipo === "licencia"
                  ? "Lee el nombre y el número de esta licencia."
                  : "Lee las placas de esta unidad.",
            },
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

    const validado = esquemaLecturaIdentificacion.safeParse(JSON.parse(contenido));
    if (!validado.success) {
      return { ok: false, error: "La respuesta llegó con una forma inesperada." };
    }

    return {
      ok: true,
      datos: {
        ...validado.data,
        // Las placas no tienen titular; si el modelo se equivoca y manda
        // algo, no debe colarse al formulario.
        nombre: tipo === "placas" ? null : validado.data.nombre,
      },
    };
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) {
      const status = (e as { status?: number }).status;
      if (status === 401) return { ok: false, error: "La configuración de IA no es válida." };
      if (status === 429) return { ok: false, error: "El servicio está saturado. Intenta en un momento." };
      if (status && status >= 500) return { ok: false, error: "El servicio de IA no está disponible." };
    }
    return {
      ok: false,
      error:
        tipo === "licencia"
          ? "No se pudo leer la licencia."
          : "No se pudieron leer las placas.",
    };
  }
}
