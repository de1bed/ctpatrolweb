import "server-only";

import OpenAI from "openai";

import { openaiEnv } from "@/lib/env";

/**
 * Cliente de OpenAI.
 *
 * ── Reglas que no se rompen ─────────────────────────────────────────────────
 *
 * 1. `server-only` arriba. Si alguien importa este archivo desde un componente
 *    de cliente, el build FALLA. No es un comentario pidiendo cuidado: es una
 *    barrera que el compilador aplica. En el sistema anterior la llave iba con
 *    prefijo EXPO_PUBLIC_ y viajaba dentro del bundle, legible por cualquiera
 *    que abriera las herramientas del navegador.
 *
 * 2. La llave se lee de forma perezosa. La app arranca sin ella; solo revienta
 *    —con un mensaje claro— quien intente usar la IA sin configurarla.
 *
 * 3. Timeout y reintentos acotados. Una petición de visión colgada bloquearía
 *    al inspector; y reintentar sin límite contra un error real solo quema
 *    presupuesto.
 */

let cliente: OpenAI | null = null;

export function openai(): OpenAI {
  if (!cliente) {
    const { OPENAI_API_KEY } = openaiEnv();
    cliente = new OpenAI({
      apiKey: OPENAI_API_KEY,
      // 60 s: el análisis de una imagen tarda segundos, no minutos. Si se pasa
      // de aquí, algo va mal y es mejor devolver el control que esperar.
      timeout: 60_000,
      maxRetries: 2,
    });
  }
  return cliente;
}

/**
 * Modelo de visión.
 *
 * Configurable por entorno para poder cambiarlo sin tocar código ni desplegar,
 * que es justo lo que se necesita cuando sale uno mejor o más barato.
 */
export function modeloVision(): string {
  return process.env.OPENAI_VISION_MODEL || "gpt-4.1";
}

/** Tope de llamadas por inspección, para que un bug no se coma el presupuesto. */
export function topeLlamadas(): number {
  const { OPENAI_MAX_CALLS_PER_INSPECTION } = openaiEnv();
  return OPENAI_MAX_CALLS_PER_INSPECTION;
}
