import type { Json } from "@/lib/supabase/database.types";

/**
 * Lectura defensiva de `inspections.progress`.
 *
 * La columna es JSONB, así que puede traer cualquier cosa: un registro viejo
 * con otra forma, algo escrito a mano en el dashboard, o `{}` recién creado.
 * Si el parseo se hiciera con un cast optimista, un dato raro tumbaría la
 * pantalla de un inspector a media inspección.
 *
 * Ante la duda, se devuelve progreso vacío: el inspector vuelve a marcar una
 * fase, que es molesto pero recuperable. Una pantalla en blanco no lo es.
 */

export type Progreso = {
  /** Claves de paso terminadas. Ver `clavePaso` en flujo.ts */
  completados: string[];
  /** Último paso abierto, para poder ofrecer "continuar donde iba". */
  ultimoPaso: string | null;
};

export const PROGRESO_VACIO: Progreso = { completados: [], ultimoPaso: null };

export function leerProgreso(valor: Json | null | undefined): Progreso {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return PROGRESO_VACIO;
  }

  const bruto = valor as Record<string, unknown>;

  const completados = Array.isArray(bruto.completados)
    ? bruto.completados.filter((x): x is string => typeof x === "string")
    : [];

  const ultimoPaso =
    typeof bruto.ultimoPaso === "string" ? bruto.ultimoPaso : null;

  // Sin duplicados: marcar dos veces la misma fase inflaría el avance.
  return { completados: [...new Set(completados)], ultimoPaso };
}

export function marcarCompletado(progreso: Progreso, clave: string): Progreso {
  return {
    completados: [...new Set([...progreso.completados, clave])],
    ultimoPaso: clave,
  };
}

export function desmarcarCompletado(progreso: Progreso, clave: string): Progreso {
  return {
    ...progreso,
    completados: progreso.completados.filter((c) => c !== clave),
  };
}
