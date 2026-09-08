import "server-only";

import { z } from "zod";

import { modeloVision, openai } from "./cliente";

/**
 * Extracción de datos de documentos de embarque.
 *
 * Sustituye al OCR.space + Gemini del sistema anterior. No es OCR crudo —no
 * queremos el texto completo de la hoja— sino extracción dirigida: de una
 * factura o un pedimento solo interesan cuatro números concretos, y pedirlos
 * por nombre da mucho mejor resultado que transcribir todo y luego buscar
 * con expresiones regulares.
 *
 * Cada campo viene con su nivel de confianza, y la interfaz marca los dudosos
 * para que el inspector los verifique en lugar de aceptarlos a ciegas. Un
 * número de pedimento mal leído invalida el expediente ante aduana.
 */

export const esquemaExtraccion = z.object({
  factura: z.string().nullable(),
  billOfLading: z.string().nullable(),
  pedimento: z.string().nullable(),
  sellosFiscales: z.string().nullable(),
  /** Campos que el modelo leyó con duda. La interfaz los resalta. */
  camposDudosos: z.array(z.string()),
  /** Qué documento cree que es. Solo informativo. */
  tipoDocumento: z.string().nullable(),
  /** Por qué no pudo leer, cuando no pudo. */
  problema: z.string().nullable(),
});

export type Extraccion = z.infer<typeof esquemaExtraccion>;

const INSTRUCCIONES = `Extraes datos de documentos de comercio exterior mexicano
para una inspección C-TPAT.

Busca estos cuatro campos y devuelve SOLO su valor, sin etiquetas ni texto extra:

- factura: número de factura comercial (invoice)
- billOfLading: número de Bill of Lading, BL, guía o carta porte
- pedimento: número de pedimento aduanal (suele tener 15 dígitos con formato
  como 24 43 3456 4001234)
- sellosFiscales: número de sello fiscal o candado oficial

Reglas estrictas:
- Si un campo NO aparece en la imagen, devuélvelo como null. NO lo inventes ni
  lo deduzcas. Un número inventado es peor que un campo vacío: nadie lo va a
  revisar porque parece correcto.
- Si lees un campo pero dudas de algún carácter (borroso, cortado, ambiguo
  entre 0 y O, entre 1 y 7), inclúyelo igual pero agrega su nombre a
  camposDudosos.
- Conserva el formato tal como aparece: guiones, espacios y ceros a la
  izquierda son parte del número.
- Si la imagen está muy borrosa, muy oscura o no es un documento, deja todos
  los campos en null y explica en 'problema' qué pasó.
- Responde en español.`;

export type ResultadoExtraccion =
  | { ok: true; datos: Extraccion }
  | { ok: false; error: string };

export async function extraerDeDocumento(
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoExtraccion> {
  try {
    const respuesta = await openai().chat.completions.create({
      model: modeloVision(),
      // Cero temperatura: transcribir un número no admite creatividad.
      temperature: 0,
      max_tokens: 500,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extraccion_documento",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "factura",
              "billOfLading",
              "pedimento",
              "sellosFiscales",
              "camposDudosos",
              "tipoDocumento",
              "problema",
            ],
            properties: {
              factura: { type: ["string", "null"] },
              billOfLading: { type: ["string", "null"] },
              pedimento: { type: ["string", "null"] },
              sellosFiscales: { type: ["string", "null"] },
              camposDudosos: { type: "array", items: { type: "string" } },
              tipoDocumento: { type: ["string", "null"] },
              problema: { type: ["string", "null"] },
            },
          },
        },
      },
      messages: [
        { role: "system", content: INSTRUCCIONES },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae los datos de este documento." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imagenBase64}`,
                // Alta resolución obligatoria: con "low" los dígitos de un
                // pedimento impreso en letra chica se vuelven ilegibles.
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content;
    if (!contenido) return { ok: false, error: "El modelo no devolvió contenido." };

    const validado = esquemaExtraccion.safeParse(JSON.parse(contenido));
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
