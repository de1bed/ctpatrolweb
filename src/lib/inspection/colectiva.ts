/**
 * Reglas de las inspecciones colectivas.
 *
 * Varias personas de la misma empresa capturan una inspección: una fase la
 * ocupa una sola persona a la vez, y al final firman todos los que
 * participaron, en un solo teléfono.
 *
 * Aquí solo hay lógica pura; los datos vienen de participantes_inspeccion
 * (migración 0020).
 */

/** Cada cuánto renueva su fase quien la tiene ocupada. La base la libera a los 2 min. */
export const SEGUNDOS_LATIDO = 30;

/** Cada cuánto se revisa quién está dónde, para avisar a los demás. */
export const SEGUNDOS_CONSULTA = 15;

export type Persona = {
  perfilId: string;
  nombre: string;
  /** Fases distintas que guardó. */
  fases: number;
  /** Evidencia registrada a su nombre. */
  fotos: number;
  /** Fase en la que está ahora, si su latido es reciente. */
  pasoActual: string | null;
};

/** Firma de un participante dentro de la fase de firmas. */
export type FirmaParticipante = {
  perfilId: string;
  nombre: string;
  firma: string;
};

/**
 * Participa quien completó al menos una fase o tomó evidencia. Solo abrir la
 * inspección o estar dentro de una fase no basta.
 */
export function esParticipante(p: Persona): boolean {
  return p.fases > 0 || p.fotos > 0;
}

/**
 * En qué teléfono se firma: el de quien hizo más fases. Empate: más fotos,
 * luego por nombre, para que todos vean el mismo resultado.
 */
export function quienCierra(personas: Persona[]): Persona | null {
  const candidatos = personas.filter(esParticipante);
  if (candidatos.length === 0) return null;
  return [...candidatos].sort(
    (a, b) => b.fases - a.fases || b.fotos - a.fotos || a.nombre.localeCompare(b.nombre)
  )[0];
}

/** Los demás participantes: quienes tienen que firmar además de quien cierra. */
export function otrosParticipantes(personas: Persona[], yoId: string): Persona[] {
  return personas.filter((p) => esParticipante(p) && p.perfilId !== yoId);
}

/** Participantes (salvo quien cierra) que todavía no tienen firma. */
export function firmasPendientes(
  personas: Persona[],
  yoId: string,
  firmas: { perfilId: string; firma?: string | null }[]
): Persona[] {
  const firmados = new Set(firmas.filter((f) => f.firma).map((f) => f.perfilId));
  return otrosParticipantes(personas, yoId).filter((p) => !firmados.has(p.perfilId));
}

/** Quienes están ahora mismo dentro de alguna fase, sin contarme. */
export function ocupadosPorOtros(personas: Persona[], yoId: string): Persona[] {
  return personas.filter((p) => p.pasoActual && p.perfilId !== yoId);
}
