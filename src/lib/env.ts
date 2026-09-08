import { z } from "zod";

/**
 * Variables de entorno, validadas.
 *
 * Dos bloques con reglas distintas:
 *
 *   clientEnv  Se compilan dentro del JavaScript que baja al navegador.
 *              Cualquiera las puede leer. Solo van aquí cosas públicas.
 *
 *   serverEnv  Nunca salen del servidor. Se validan de forma perezosa —
 *              al primer uso, no al arrancar — para que la app levante
 *              aunque todavía no tengas la llave de OpenAI configurada.
 *              El día que falte, revienta en el endpoint que la necesita
 *              con un mensaje claro, no con un 500 sin explicación.
 *
 * Next solo sustituye process.env.NEXT_PUBLIC_* cuando la referencia está
 * escrita literalmente. Por eso se listan una por una en vez de recorrer
 * process.env en un bucle: con un acceso dinámico llegarían vacías al
 * navegador y el bug sería de los que cuesta encontrar.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL debe ser una URL completa (https://xxx.supabase.co)",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, {
    message: "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  }),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsedClient.success) {
  const detalle = parsedClient.error.issues
    .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Configuración incompleta. Revisa .env.local (usa .env.example como guía):\n${detalle}`
  );
}

export const clientEnv = parsedClient.data;

// ----------------------------------------------------------------------------

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message:
      "Falta SUPABASE_SERVICE_ROLE_KEY. Se saca del panel de Supabase en " +
      "Project Settings → API Keys → service_role.",
  }),
});

const openaiSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, {
    message: "Falta OPENAI_API_KEY. Sin ella no se puede analizar evidencia con IA.",
  }),
  OPENAI_MAX_CALLS_PER_INSPECTION: z.coerce.number().int().positive().default(40),
});

function leer<T>(schema: z.ZodType<T>, valores: Record<string, unknown>): T {
  const resultado = schema.safeParse(valores);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Configuración de servidor incompleta: ${detalle}`);
  }
  return resultado.data;
}

/** Credenciales de servidor de Supabase. Lanza si no están configuradas. */
export function serverEnv() {
  return leer(serverSchema, {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

/** Credenciales de OpenAI. Lanza si no están configuradas. */
export function openaiEnv() {
  return leer(openaiSchema, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MAX_CALLS_PER_INSPECTION: process.env.OPENAI_MAX_CALLS_PER_INSPECTION,
  });
}

/** Para pintar avisos en la UI sin reventar: ¿ya está lista la IA? */
export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
