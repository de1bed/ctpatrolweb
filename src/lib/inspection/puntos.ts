/**
 * Puntos de inspección visual.
 *
 * Son las posiciones donde el inspector tiene que tomar foto y calificar.
 * Vienen del formato C-TPAT y se conservan tal cual del sistema anterior,
 * incluida la redacción de las pistas: los inspectores ya se las saben, y
 * cambiarles las palabras solo genera dudas en campo.
 *
 * `clave` es lo que se guarda en la base (en inspection_media.point_key) y
 * NUNCA debe cambiar una vez que hay inspecciones capturadas: es lo que liga
 * una foto con su punto en los reportes históricos. El `nombre` sí se puede
 * corregir libremente, porque solo se muestra.
 */

export type PuntoInspeccion = {
  /** Identificador estable. No cambiar: liga la evidencia histórica. */
  clave: string;
  nombre: string;
  pista: string;
  /** Posición sobre el diagrama, en porcentaje. Solo para el tractor. */
  x?: number;
  y?: number;
};

export type GrupoPuntos = "tractor" | "internos" | "exterior";

/** Fase 6 · Inspección externa del tractor (16 puntos). */
export const PUNTOS_TRACTOR: PuntoInspeccion[] = [
  { clave: "defensa", nombre: "Defensa", pista: "Verificar integridad estructural sin modificaciones", x: 15, y: 30 },
  { clave: "llantas_rines", nombre: "Llantas y rines", pista: "Revisar todas las llantas por cavidades ocultas", x: 20, y: 65 },
  { clave: "caja_bateria", nombre: "Caja de batería", pista: "Inspeccionar compartimento y cables", x: 35, y: 45 },
  { clave: "puertas", nombre: "Puertas", pista: "Comprobar sellado y mecanismos", x: 50, y: 40 },
  { clave: "compartimiento_herramienta", nombre: "Compartimiento herramienta", pista: "Verificar contenido y espacios ocultos", x: 65, y: 55 },
  { clave: "mecanismos_cerrado", nombre: "Mecanismos de cerrado", pista: "Probar funcionamiento de cerraduras", x: 50, y: 60 },
  { clave: "tanque_aire", nombre: "Tanque de aire", pista: "Verificar conexiones y sellado", x: 70, y: 40 },
  { clave: "tanque_combustible", nombre: "Tanque de combustible", pista: "Revisar integridad sin doble pared", x: 70, y: 65 },
  { clave: "cabina", nombre: "Cabina", pista: "Inspeccionar interior y compartimentos", x: 50, y: 25 },
  { clave: "rompevientos_techo", nombre: "Rompe vientos y techo", pista: "Verificar estructura sin modificaciones", x: 50, y: 15 },
  { clave: "motor", nombre: "Motor", pista: "Revisar compartimento del motor", x: 25, y: 40 },
  { clave: "quinta_rueda_chasis", nombre: "Quinta rueda y chasis", pista: "Inspeccionar área sin compartimentos ocultos", x: 80, y: 50 },
  { clave: "mofle", nombre: "Mofle", pista: "Verificar sistema de escape completo", x: 40, y: 70 },
  { clave: "luces", nombre: "Luces", pista: "Probar funcionamiento de todas las luces", x: 10, y: 35 },
  { clave: "mangueras_frenos", nombre: "Mangueras de frenos", pista: "Revisar integridad sin fugas", x: 30, y: 70 },
  { clave: "polveras", nombre: "Polveras", pista: "Verificar sellado hermético", x: 75, y: 70 },
];

/** Fase 7 · Inspección interna del espacio de carga (6 puntos). */
export const PUNTOS_INTERNOS: PuntoInspeccion[] = [
  { clave: "pared_frontal", nombre: "Pared frontal", pista: "Verificar integridad sin compartimentos ocultos" },
  { clave: "pared_izquierda", nombre: "Pared izquierda", pista: "Revisar por doble pared o modificaciones" },
  { clave: "pared_derecha", nombre: "Pared derecha", pista: "Comprobar uniformidad del material" },
  { clave: "piso_interior", nombre: "Piso interior", pista: "Inspeccionar por áreas huecas o modificaciones" },
  { clave: "techo_interno", nombre: "Techo interno", pista: "Verificar integridad sin cortes" },
  { clave: "puerta_ext_int", nombre: "Puerta externa e interna", pista: "Revisar interior sin compartimentos ocultos" },
];

/** Fase 8 · Inspección externa del remolque o contenedor (19 puntos). */
export const PUNTOS_EXTERIOR: PuntoInspeccion[] = [
  { clave: "pared_frontal_ext", nombre: "Pared frontal (externa)", pista: "Verificar integridad sin modificaciones" },
  { clave: "pared_frontal_int", nombre: "Pared frontal (interna)", pista: "Revisar por espacios ocultos detrás de revestimientos" },
  { clave: "paredes_laterales", nombre: "Pared derecha e izquierda", pista: "Comprobar ambas paredes sin doble pared" },
  { clave: "piso", nombre: "Piso", pista: "Inspeccionar por compartimentos ocultos" },
  { clave: "techo_externo", nombre: "Techo externo (visual a través de CCTV)", pista: "Usar CCTV para verificar integridad" },
  { clave: "puertas_ext_int", nombre: "Puertas (externa e interna)", pista: "Revisar mecanismos y marcos sin modificaciones" },
  { clave: "chasis", nombre: "Chasis", pista: "Verificar estructura sin alteraciones" },
  { clave: "cubierta_ventilador", nombre: "Cubierta de ventilador (caja refrigerada)", pista: "Comprobar sellado del sistema de refrigeración" },
  { clave: "compartimiento_quinta_rueda", nombre: "Compartimiento de la quinta rueda", pista: "Inspeccionar área sin compartimentos ocultos" },
  { clave: "parachoques_trasero", nombre: "Parachoques trasero", pista: "Verificar sellado sin modificaciones" },
  { clave: "manijas_varillas_seguros", nombre: "Manijas, varillas y seguros", pista: "Probar funcionamiento de todos los mecanismos" },
  { clave: "soportes", nombre: "Soportes", pista: "Revisar integridad estructural" },
  { clave: "remaches", nombre: "Remaches", pista: "Verificar uniformidad sin remaches nuevos" },
  { clave: "llanta_refaccion", nombre: "Llanta de refacción", pista: "Inspeccionar llanta y soporte sin modificaciones" },
  { clave: "luces_laterales_chasis", nombre: "Luces laterales del chasis", pista: "Probar funcionamiento completo" },
  { clave: "direccionales_frenos_chasis", nombre: "Direccionales y luces de frenos del chasis", pista: "Verificar sincronización con sistema del tractor" },
  { clave: "llantas", nombre: "Llantas", pista: "Revisar todas por doble pared o cavidades" },
  { clave: "polveras_remolque", nombre: "Polveras", pista: "Verificar sellado hermético" },
  { clave: "placas", nombre: "Placas", pista: "Comprobar autenticidad y vigencia" },
];

export const PUNTOS_POR_GRUPO: Record<GrupoPuntos, PuntoInspeccion[]> = {
  tractor: PUNTOS_TRACTOR,
  internos: PUNTOS_INTERNOS,
  exterior: PUNTOS_EXTERIOR,
};

/**
 * Calificación de un punto.
 *
 * Tres niveles y no un simple sí/no: "regular" es lo que permite documentar
 * un hallazgo menor sin reprobar la unidad completa, que es la distinción que
 * un inspector necesita hacer en campo todo el tiempo.
 */
export const CALIFICACIONES = ["bueno", "regular", "malo"] as const;
export type Calificacion = (typeof CALIFICACIONES)[number];

/**
 * Verificación VVTT de sellos: Ver, Verificar, Jalar, Girar.
 * Es el protocolo estándar de C-TPAT y los cuatro pasos son obligatorios.
 */
export const PASOS_VVTT = [
  { clave: "ver", nombre: "Ver", pista: "Observar el sello y su condición general" },
  { clave: "verificar", nombre: "Verificar", pista: "Cotejar el número contra la documentación" },
  { clave: "jalar", nombre: "Jalar", pista: "Tirar del sello para confirmar que está firme" },
  { clave: "girar", nombre: "Girar", pista: "Torcer el sello para detectar manipulación" },
] as const;

export type PasoVvtt = (typeof PASOS_VVTT)[number]["clave"];
