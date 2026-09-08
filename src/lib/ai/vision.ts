import "server-only";

import { z } from "zod";

import { modeloVision, openai } from "./cliente";

/**
 * Análisis de una foto de inspección.
 *
 * ── Qué hace y qué NO hace ──────────────────────────────────────────────────
 *
 * La IA es una segunda opinión, nunca la que decide. Devuelve observaciones
 * sobre lo que se ve en la foto; la calificación del punto la pone el
 * inspector, que es quien estuvo ahí y quien firma.
 *
 * Eso no es una limitación técnica: es la postura correcta. Un modelo que no
 * puede tocar la unidad ni ver el otro lado no puede responsabilizarse de un
 * dictamen aduanal. Lo que sí aporta es señalar cosas que a un ojo cansado a
 * las 3 a.m. se le pueden pasar.
 */

/** Forma exacta que se le exige al modelo. */
export const esquemaAnalisis = z.object({
  /** Qué se aprecia, en una frase. */
  observacion: z.string().max(400),
  /**
   * Indicios de alteración: soldaduras recientes, remaches nuevos, pintura
   * despareja, tornillería que no corresponde. Es lo que busca C-TPAT.
   */
  indicios: z.array(z.string().max(200)).max(6),
  /** Qué tan clara está la foto para poder juzgar el punto. */
  calidadImagen: z.enum(["buena", "regular", "mala"]),
  /** Motivo cuando la calidad no alcanza, para poder pedir otra foto. */
  problemaCalidad: z.string().max(200).nullable(),
  /**
   * Sugerencia, NO dictamen. El campo se llama así a propósito: si se llamara
   * "calificacion" invitaría a copiarla tal cual al expediente.
   */
  sugerencia: z.enum(["sin_novedad", "revisar", "atencion"]),
  /** Qué tan seguro está el modelo, 0 a 1. */
  confianza: z.number().min(0).max(1),
});

export type Analisis = z.infer<typeof esquemaAnalisis>;

const INSTRUCCIONES = `Eres apoyo para un inspector de seguridad C-TPAT en la frontera de México.

Analizas UNA foto de UN punto de inspección de un tractor, remolque o contenedor.

Busca específicamente indicios de alteración o compartimentos ocultos:
- Soldaduras recientes o que no corresponden al resto de la unidad
- Remaches nuevos, desparejos o de distinto material
- Pintura fresca, de tono distinto o aplicada sobre suciedad
- Tornillería que no coincide, marcas de herramienta, tornillos barridos
- Paneles, pisos o paredes con grosor o textura inconsistente
- Sellos, cerraduras o mecanismos forzados

Reglas:
- Describe SOLO lo que se ve en la imagen. No supongas lo que hay fuera del encuadre.
- Si la foto está borrosa, oscura o muy lejos para juzgar, dilo en calidadImagen y explica en problemaCalidad. Es más útil pedir otra foto que adivinar.
- Si no hay nada anómalo, dilo con claridad. La mayoría de los puntos salen bien y sobrediagnosticar le hace perder tiempo al inspector.
- sugerencia es una recomendación, no un dictamen. El inspector califica.
- Responde en español.`;

export type EntradaAnalisis = {
  /** Imagen en base64, sin el prefijo data:. */
  imagenBase64: string;
  mimeType: string;
  puntoNombre: string;
  puntoPista: string;
};

export type ResultadoAnalisis =
  | { ok: true; analisis: Analisis; modelo: string; tokens: number }
  | { ok: false; error: string };

export async function analizarPunto(
  entrada: EntradaAnalisis
): Promise<ResultadoAnalisis> {
  const modelo = modeloVision();

  try {
    const respuesta = await openai().chat.completions.create({
      model: modelo,
      // Temperatura baja: se busca consistencia, no creatividad. Dos análisis
      // de la misma foto deben decir lo mismo.
      temperature: 0.1,
      max_tokens: 600,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analisis_punto_inspeccion",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "observacion",
              "indicios",
              "calidadImagen",
              "problemaCalidad",
              "sugerencia",
              "confianza",
            ],
            properties: {
              observacion: { type: "string" },
              indicios: { type: "array", items: { type: "string" } },
              calidadImagen: { type: "string", enum: ["buena", "regular", "mala"] },
              problemaCalidad: { type: ["string", "null"] },
              sugerencia: {
                type: "string",
                enum: ["sin_novedad", "revisar", "atencion"],
              },
              confianza: { type: "number" },
            },
          },
        },
      },
      messages: [
        { role: "system", content: INSTRUCCIONES },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Punto de inspección: ${entrada.puntoNombre}\nQué se busca: ${entrada.puntoPista}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${entrada.mimeType};base64,${entrada.imagenBase64}`,
                // "high" para poder distinguir una soldadura de una sombra.
                // Con "low" la imagen se reduce tanto que el detalle que
                // importa desaparece, y el análisis deja de valer.
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content;
    if (!contenido) return { ok: false, error: "El modelo no devolvió contenido." };

    // Se valida la respuesta aunque venga con json_schema estricto. El esquema
    // lo aplica el proveedor; confiar en que siempre cumple es depender de
    // algo que no controlamos.
    const validado = esquemaAnalisis.safeParse(JSON.parse(contenido));
    if (!validado.success) {
      return { ok: false, error: "El modelo devolvió una respuesta con forma inesperada." };
    }

    return {
      ok: true,
      analisis: validado.data,
      modelo,
      tokens: respuesta.usage?.total_tokens ?? 0,
    };
  } catch (e) {
    return { ok: false, error: explicarError(e) };
  }
}

/**
 * Traduce los errores de OpenAI a algo que el inspector pueda entender.
 *
 * Nunca se le enseña el mensaje crudo del proveedor: puede incluir fragmentos
 * de la petición y no le dice nada útil a quien está en un patio.
 */
function explicarError(e: unknown): string {
  if (e && typeof e === "object" && "status" in e) {
    const status = (e as { status?: number }).status;
    if (status === 401) return "La configuración de IA no es válida. Avisa a soporte.";
    if (status === 429) return "El servicio de IA está saturado. Intenta en un momento.";
    if (status === 400) return "La imagen no se pudo procesar.";
    if (status && status >= 500) return "El servicio de IA no está disponible.";
  }
  if (e instanceof Error && e.name === "APIConnectionTimeoutError") {
    return "El análisis tardó demasiado. Intenta de nuevo.";
  }
  return "No se pudo analizar la imagen.";
}
