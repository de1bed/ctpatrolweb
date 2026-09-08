/** Props que recibe toda pantalla de fase. */
export type PropsFase = {
  inspeccionId: string;
  clavePaso: string;
  titulo: string;
  /** Posición dentro del flujo, para el "Paso N de M". */
  indice: number;
  total: number;
  /** Lo que ya se había guardado en esta fase, si el inspector vuelve a ella. */
  datosPrevios: Record<string, unknown> | null;
  /** Contexto de la inspección que algunas fases necesitan. */
  contexto: {
    tipoTransporte: string | null;
    esFull: boolean;
    nombreInspector: string;
    /** Número de caja (1 o 2) en las fases que se repiten por unidad. */
    unidad: number | null;
  };
};

/** Lee un campo de los datos previos con un valor por defecto seguro. */
export function previo<T>(
  datos: Record<string, unknown> | null,
  campo: string,
  porDefecto: T
): T {
  if (!datos) return porDefecto;
  const valor = datos[campo];
  return valor === undefined || valor === null ? porDefecto : (valor as T);
}
