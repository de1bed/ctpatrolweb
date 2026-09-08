/**
 * Configuración de los catálogos.
 *
 * Vive aparte de `acciones.ts` porque un archivo marcado con "use server"
 * solo puede exportar funciones async: todo lo que exporta se convierte en un
 * punto de entrada invocable desde el cliente, y un objeto no lo es.
 */

export type TipoCatalogo =
  | "clientes"
  | "conductores"
  | "tractores"
  | "contenedores";

/** Mapea cada catálogo a su tabla y a los dos campos que se muestran. */
export const TABLAS = {
  clientes: { tabla: "customers", principal: "name", secundario: "tax_id" },
  conductores: { tabla: "drivers", principal: "name", secundario: "license_number" },
  tractores: { tabla: "tractors", principal: "unit_number", secundario: "plates" },
  contenedores: { tabla: "containers", principal: "number", secundario: "plates" },
} as const;
