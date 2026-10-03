/**
 * Fotos de identificación: licencia del conductor y placas de la unidad.
 *
 * Viven en inspection_media como cualquier evidencia, con `phase` = la clave
 * del paso y `point_key` = uno de estos puntos. El reporte y el QR público
 * los separan de la evidencia de inspección por la fase.
 */

/** Punto de la foto de licencia del conductor principal. */
export const PUNTO_LICENCIA_PRINCIPAL = "licencia";

/** Punto de la foto de placas en tractor y remolque. */
export const PUNTO_PLACAS = "placas";

/** Fases cuya evidencia es identificación, no inspección física. */
export const FASES_IDENTIFICACION = ["conductor", "tractor", "placas-remolque"] as const;

type Media = {
  phase: string;
  point_key: string | null;
  captured_at: string;
};

/**
 * La foto vigente de cada punto: la más reciente.
 *
 * Volver a tomar una foto no borra la anterior del servidor (la evidencia no
 * se destruye desde el teléfono), así que puede haber varias por punto.
 */
export function ultimaPorPunto<T extends Media>(media: T[]): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const m of media) {
    if (!m.point_key) continue;
    const llave = `${m.phase}|${m.point_key}`;
    const actual = mapa.get(llave);
    if (!actual || m.captured_at > actual.captured_at) mapa.set(llave, m);
  }
  return mapa;
}
