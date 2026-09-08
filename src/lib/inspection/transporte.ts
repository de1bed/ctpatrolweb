import type { Database } from "@/lib/supabase/database.types";

export type TipoTransporte = Database["public"]["Enums"]["transport_type"];

/**
 * Qué necesita inspeccionarse según el tipo de transporte.
 *
 * ── Por qué esta tabla existe ───────────────────────────────────────────────
 *
 * En el sistema anterior esta lógica estaba repartida en cinco funciones
 * sueltas (`needsSizeScreen`, `needsInternalInspection`, `needsContainerVisual`,
 * `needsContainerPlates`, `getContainerLogic`), cada una con su propia lista de
 * tipos escrita a mano. Agregar un tipo de transporte significaba acordarse de
 * las cinco. Y ya se les fue una: ver DISCREPANCIAS abajo.
 *
 * Aquí es una fila por tipo. Agregar "dolly" o "jaula ganadera" es agregar un
 * renglón, y TypeScript obliga a llenar todas las columnas — no se puede
 * olvidar ninguna.
 */
export type CapacidadesTransporte = {
  /** Etiqueta para la interfaz. */
  nombre: string;

  /** ¿Se le pregunta el tamaño (20/40/45/48/53 pies)? */
  requiereTamano: boolean;

  /** ¿Se inspecciona por dentro? (6 puntos) */
  requiereInspeccionInterna: boolean;

  /** ¿Se inspecciona el remolque/contenedor por fuera? (19 puntos) */
  requiereInspeccionExterna: boolean;

  /** ¿Se capturan por separado las placas del remolque/contenedor? */
  requierePlacasRemolque: boolean;

  /** ¿Puede ir en configuración doble (full)? */
  admiteFull: boolean;

  /**
   * Cuántos espacios de carga se inspeccionan en configuración sencilla.
   *
   * OJO: no es lo mismo que tener remolque. Una van o un rabón son unidades
   * rígidas —la caja es parte del camión, no hay remolque aparte— pero SÍ
   * tienen un espacio de carga que se inspecciona por dentro. Una pipa, en
   * cambio, no se abre: ahí es 0.
   */
  unidadesDeCarga: 0 | 1;

  /**
   * Cómo se le llama a la unidad de arrastre en la interfaz, o null si la
   * caja es parte del vehículo. Solo afecta el texto que se muestra.
   */
  unidadArrastre: "contenedor" | "remolque" | null;
};

export const CAPACIDADES: Record<TipoTransporte, CapacidadesTransporte> = {
  caja: {
    nombre: "Caja seca",
    requiereTamano: true,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: true,
    requierePlacasRemolque: true,
    admiteFull: true,
    unidadesDeCarga: 1,
    unidadArrastre: "remolque",
  },

  caja_refrigerada: {
    nombre: "Caja refrigerada",
    requiereTamano: true,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: true,
    // DISCREPANCIA 1 (heredada): el sistema anterior pedía placas de remolque
    // para "contenedor" y "caja" pero NO para caja refrigerada, aunque también
    // las tiene. Se conserva el comportamiento viejo para no cambiar una regla
    // de negocio por cuenta propia. Pendiente de confirmar con David.
    requierePlacasRemolque: false,
    admiteFull: true,
    unidadesDeCarga: 1,
    unidadArrastre: "remolque",
  },

  contenedor: {
    nombre: "Contenedor",
    requiereTamano: true,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: true,
    requierePlacasRemolque: true,
    admiteFull: true,
    unidadesDeCarga: 1,
    unidadArrastre: "contenedor",
  },

  plataforma: {
    nombre: "Plataforma",
    requiereTamano: false,
    // Una plataforma es plana: no hay "dentro" que inspeccionar.
    requiereInspeccionInterna: false,
    // DISCREPANCIA 2 (heredada): el código viejo se contradecía solo.
    // `getContainerLogic` decía explícitamente que plataforma SÍ lleva
    // inspección exterior de 19 puntos, pero `needsContainerVisual` la
    // excluía, así que la pantalla nunca aparecía. Se sigue el comentario
    // explícito (sí lleva exterior) porque es lo que tiene sentido: el chasis,
    // las llantas y las luces de una plataforma sí se revisan.
    // Pendiente de confirmar con David.
    requiereInspeccionExterna: true,
    requierePlacasRemolque: false,
    // El tipo original marcaba "full NO disponible para plataforma".
    admiteFull: false,
    unidadesDeCarga: 1,
    unidadArrastre: "remolque",
  },

  // ── Unidades rígidas ──────────────────────────────────────────────────────
  // Camión de una sola pieza: la caja es parte del vehículo, no hay remolque
  // aparte. Por eso llevan inspección interna pero no externa de remolque.

  van: {
    nombre: "Van",
    requiereTamano: false,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: false,
    requierePlacasRemolque: false,
    admiteFull: false,
    unidadesDeCarga: 1,
    unidadArrastre: null,
  },

  rabon: {
    nombre: "Rabón",
    requiereTamano: false,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: false,
    requierePlacasRemolque: false,
    admiteFull: false,
    unidadesDeCarga: 1,
    unidadArrastre: null,
  },

  torton: {
    nombre: "Tortón",
    requiereTamano: false,
    requiereInspeccionInterna: true,
    requiereInspeccionExterna: false,
    requierePlacasRemolque: false,
    admiteFull: false,
    unidadesDeCarga: 1,
    unidadArrastre: null,
  },

  // ── Sin espacio de carga inspeccionable ───────────────────────────────────

  pipa: {
    nombre: "Pipa",
    requiereTamano: false,
    // Un tanque no se abre para inspeccionarlo por dentro.
    requiereInspeccionInterna: false,
    requiereInspeccionExterna: false,
    requierePlacasRemolque: false,
    admiteFull: false,
    unidadesDeCarga: 0,
    unidadArrastre: null,
  },

  lowboy: {
    nombre: "Lowboy",
    requiereTamano: false,
    requiereInspeccionInterna: false,
    requiereInspeccionExterna: false,
    requierePlacasRemolque: false,
    admiteFull: false,
    unidadesDeCarga: 0,
    unidadArrastre: null,
  },
};

/** Lista para poblar selectores, en el orden en que se muestran. */
export const TIPOS_TRANSPORTE = Object.keys(CAPACIDADES) as TipoTransporte[];

export function capacidadesDe(tipo: TipoTransporte | null | undefined) {
  return tipo ? CAPACIDADES[tipo] : null;
}

/**
 * Cuántos espacios de carga se inspeccionan en esta configuración.
 *
 * 0 = no hay nada que inspeccionar (pipa, lowboy)
 * 1 = sencillo, incluidas las unidades rígidas
 * 2 = full (doble caja / doble contenedor)
 *
 * `esFull` solo cuenta si el tipo lo admite. Si llega en true para una
 * plataforma —por un dato viejo o por un bug de captura— se ignora en vez de
 * generar una segunda caja fantasma que nadie va a poder inspeccionar.
 */
export function numeroDeUnidades(
  tipo: TipoTransporte | null | undefined,
  esFull: boolean
): number {
  const cap = capacidadesDe(tipo);
  if (!cap || cap.unidadesDeCarga === 0) return 0;
  return cap.admiteFull && esFull ? 2 : 1;
}
