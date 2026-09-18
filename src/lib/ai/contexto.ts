/**
 * Nota que el inspector escribió en ESE punto, si hay.
 * Se manda a la IA como contexto corto; no se mandan los comentarios
 * generales de la inspección (otra fase, otro propósito).
 */
export function notaDelPunto(
  data: unknown,
  phase: string | null,
  pointKey: string | null
): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!phase || !pointKey) return null;

  const paso = (data as Record<string, unknown>)[phase];
  if (!paso || typeof paso !== "object" || Array.isArray(paso)) return null;

  const puntos = (paso as Record<string, unknown>).puntos;
  if (!puntos || typeof puntos !== "object" || Array.isArray(puntos)) return null;

  const punto = (puntos as Record<string, unknown>)[pointKey];
  if (!punto || typeof punto !== "object" || Array.isArray(punto)) return null;

  const nota = (punto as { nota?: unknown }).nota;
  if (typeof nota !== "string") return null;

  const limpia = nota.trim().replace(/\s+/g, " ");
  if (!limpia) return null;
  return limpia.slice(0, 280);
}
