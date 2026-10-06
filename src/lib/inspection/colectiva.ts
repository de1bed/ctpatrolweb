/**
 * Reglas de las inspecciones colectivas.
 *
 * Varias personas de la misma empresa capturan una inspección: una fase la
 * ocupa una sola persona a la vez, y al final firman todos los que
 * participaron, en el teléfono del encargado.
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

/** Los demás participantes: quienes firman además del encargado, que cierra. */
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

// ── Encargado ────────────────────────────────────────────────────────────────

/** Alguien identificado por id y nombre. */
export type Integrante = { id: string; nombre: string };

/**
 * Quién es el encargado de una colectiva.
 *
 * Es `assigned_to`: lo elige el admin al programarla en el calendario, o es
 * quien la creó desde "Nueva inspección". Si el admin la dejó sin encargado,
 * lo será quien la empiece (el servidor lo fija al guardar la primera fase).
 * Solo el encargado cierra: en su teléfono se hace la firma final.
 */
export function esEncargado(assignedTo: string | null, yoId: string): boolean {
  return assignedTo === yoId;
}

/** ¿Puede esta persona cerrar (firmar) la colectiva? Sin encargado, quien llegue. */
export function puedeCerrarColectiva(assignedTo: string | null, yoId: string): boolean {
  return assignedTo === null || assignedTo === yoId;
}

/**
 * Quienes se unieron: participantes que no son el encargado, más quienes
 * están ahora mismo dentro de una fase aunque todavía no guarden nada.
 */
export function unidos(personas: Persona[], encargadoId: string | null): Persona[] {
  return personas.filter(
    (p) => p.perfilId !== encargadoId && (esParticipante(p) || Boolean(p.pasoActual))
  );
}

/** En vivo: alguien está capturando en este momento. */
export function enVivo(personas: Persona[]): boolean {
  return personas.some((p) => Boolean(p.pasoActual));
}
