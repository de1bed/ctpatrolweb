import type { Json } from "@/lib/supabase/database.types";

/**
 * Resultado de una inspección, calculado a partir de lo capturado.
 *
 * ── Por qué se calcula y no se pregunta ─────────────────────────────────────
 *
 * Sería más simple poner un botón de "aprobada / rechazada" al final. Pero
 * entonces el resultado dependería del criterio del inspector en ese momento,
 * y dos inspecciones con los mismos hallazgos podrían salir distintas.
 *
 * Al derivarlo de los puntos calificados, el criterio es el mismo siempre y
 * queda auditable: cualquiera puede recorrer la evidencia y llegar al mismo
 * resultado.
 */

export type ResultadoInspeccion = {
  /** false si hay al menos un punto en "malo". */
  aprobada: boolean;
  /** Puntos en "regular" o "malo". */
  hallazgos: number;
  /** Solo los "malo": son los que reprueban. */
  criticos: number;
};

export function calcularResultado(data: Json | null | undefined): ResultadoInspeccion {
  let hallazgos = 0;
  let criticos = 0;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const valorFase of Object.values(data as Record<string, unknown>)) {
      if (!valorFase || typeof valorFase !== "object") continue;

      const puntos = (valorFase as Record<string, unknown>).puntos;
      if (!puntos || typeof puntos !== "object") continue;

      for (const punto of Object.values(puntos as Record<string, unknown>)) {
        if (!punto || typeof punto !== "object") continue;

        const p = punto as Record<string, unknown>;
        // Un punto marcado "no aplica" no cuenta como hallazgo: no se
        // inspeccionó porque no existía, no porque estuviera mal.
        if (p.noAplica === true) continue;

        if (p.calificacion === "malo") {
          criticos++;
          hallazgos++;
        } else if (p.calificacion === "regular") {
          hallazgos++;
        }
      }
    }
  }

  return {
    // Un solo punto en "malo" reprueba la unidad. Es lo que exige C-TPAT:
    // un compartimento alterado no se compensa con otros quince puntos bien.
    aprobada: criticos === 0,
    hallazgos,
    criticos,
  };
}
