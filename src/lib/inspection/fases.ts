import type { GrupoPuntos } from "./puntos";
import { capacidadesDe, type TipoTransporte } from "./transporte";

/**
 * Catálogo de fases de la inspección C-TPAT.
 *
 * Todo el flujo se describe aquí, en datos. Ninguna pantalla decide si le
 * toca aparecer ni cuál sigue — eso lo resuelve el motor en `flujo.ts`
 * leyendo esta tabla.
 *
 * Consecuencia práctica: cambiar el orden, volver opcional una fase o
 * agregar una nueva es editar este archivo. En el sistema anterior implicaba
 * tocar el navegador, el cálculo de progreso, la pantalla de índice y cada
 * pantalla que supiera "cuál va después".
 */

export type FaseId =
  | "configuracion"
  | "cliente"
  | "tipo-transporte"
  | "tamano"
  | "movimiento"
  | "estado-entrada"
  | "documentos"
  | "conductor"
  | "tractor"
  | "tractor-visual"
  | "inspeccion-interna"
  | "placas-remolque"
  | "inspeccion-externa"
  | "pausa"
  | "sellos"
  | "agricola"
  | "estado-salida"
  | "revision"
  | "comentarios"
  | "firmas";

/** Agrupación para el índice de fases. */
export type GrupoFase =
  | "preparacion"
  | "unidad"
  | "inspeccion-fisica"
  | "cierre";

/** Contexto con el que se evalúa si una fase aplica. */
export type ContextoFase = {
  tipoTransporte: TipoTransporte | null;
  esFull: boolean;
};

export type DefinicionFase = {
  id: FaseId;
  nombre: string;
  descripcion: string;
  grupo: GrupoFase;

  /**
   * Crítica: no se puede pausar la inspección ni saltar libremente entre
   * pantallas hasta terminarlas todas. Son las que definen QUÉ se inspecciona;
   * sin ellas el resto del flujo no sabe qué mostrar.
   */
  critica: boolean;

  /**
   * Si falta, la fase siempre aplica. Si está, se evalúa contra el contexto.
   * Las condiciones NO listan tipos de transporte a mano: preguntan a la
   * tabla de capacidades, que es la única fuente de esa verdad.
   */
  aplica?: (ctx: ContextoFase) => boolean;

  /** Qué decirle al inspector cuando la fase se omitió. */
  razonNoAplica?: string;

  /**
   * Se repite una vez por unidad de arrastre. En un full son dos pasadas,
   * una por caja.
   */
  porUnidad?: boolean;

  /** Captura visual con fotos punto por punto. */
  puntos?: GrupoPuntos;

  /**
   * Punto de pausa. Aquí la unidad se va a cargar y el inspector cierra
   * la primera mitad; retoma cuando el trailer regresa sellado.
   */
  esPausa?: boolean;
};

export const FASES: DefinicionFase[] = [
  // ── Preparación ───────────────────────────────────────────────────────────
  {
    id: "configuracion",
    nombre: "Configuración inicial",
    descripcion: "Fecha, hora de entrada y ubicación GPS",
    grupo: "preparacion",
    critica: true,
  },
  {
    id: "cliente",
    nombre: "Transportista",
    descripcion: "Seleccionar o registrar la compañía",
    grupo: "preparacion",
    critica: true,
  },

  // ── Datos de la unidad ────────────────────────────────────────────────────
  {
    id: "tipo-transporte",
    nombre: "Tipo de transporte",
    descripcion: "Define el resto del flujo",
    grupo: "unidad",
    // La más crítica de todas: de esta respuesta depende qué fases existen.
    critica: true,
  },
  {
    id: "tamano",
    nombre: "Tamaño",
    descripcion: "Medida de la caja o contenedor",
    grupo: "unidad",
    critica: false,
    aplica: (ctx) => capacidadesDe(ctx.tipoTransporte)?.requiereTamano ?? false,
    razonNoAplica: "Este tipo de transporte no maneja medida estándar",
  },
  {
    id: "movimiento",
    nombre: "Movimiento",
    descripcion: "Importación, exportación o local",
    grupo: "unidad",
    critica: false,
  },
  {
    id: "estado-entrada",
    nombre: "Estado al entrar",
    descripcion: "Cargado, vacío o botando",
    grupo: "unidad",
    critica: true,
  },
  {
    id: "documentos",
    nombre: "Documentos",
    descripcion: "Factura, BL, pedimento y sellos fiscales",
    grupo: "unidad",
    critica: false,
  },
  {
    id: "conductor",
    nombre: "Conductor",
    descripcion: "Identificación y licencia",
    grupo: "unidad",
    critica: false,
  },
  {
    id: "tractor",
    nombre: "Tractor",
    descripcion: "Número de unidad y placas",
    grupo: "unidad",
    critica: false,
  },

  // ── Inspección física ─────────────────────────────────────────────────────
  {
    id: "tractor-visual",
    nombre: "Inspección de tractor",
    descripcion: "16 puntos con evidencia fotográfica",
    grupo: "inspeccion-fisica",
    critica: true,
    puntos: "tractor",
  },
  {
    id: "inspeccion-interna",
    nombre: "Inspección interna",
    descripcion: "6 puntos dentro del espacio de carga",
    grupo: "inspeccion-fisica",
    critica: false,
    aplica: (ctx) =>
      capacidadesDe(ctx.tipoTransporte)?.requiereInspeccionInterna ?? false,
    razonNoAplica: "Este tipo de transporte no tiene espacio interior inspeccionable",
    porUnidad: true,
    puntos: "internos",
  },
  {
    id: "placas-remolque",
    nombre: "Placas del remolque",
    descripcion: "Número e identificación de la unidad de arrastre",
    grupo: "inspeccion-fisica",
    critica: false,
    aplica: (ctx) =>
      capacidadesDe(ctx.tipoTransporte)?.requierePlacasRemolque ?? false,
    razonNoAplica: "Este tipo de transporte no lleva placas de remolque por separado",
    porUnidad: true,
  },
  {
    id: "inspeccion-externa",
    nombre: "Inspección externa",
    descripcion: "19 puntos del remolque o contenedor",
    grupo: "inspeccion-fisica",
    critica: false,
    aplica: (ctx) =>
      capacidadesDe(ctx.tipoTransporte)?.requiereInspeccionExterna ?? false,
    razonNoAplica: "Este tipo de transporte no lleva unidad de arrastre que inspeccionar",
    porUnidad: true,
    puntos: "exterior",
  },

  // ── Pausa ─────────────────────────────────────────────────────────────────
  {
    id: "pausa",
    nombre: "Pausa de carga",
    descripcion: "La unidad sale a cargar y regresa sellada",
    grupo: "inspeccion-fisica",
    critica: false,
    esPausa: true,
  },

  // ── Cierre ────────────────────────────────────────────────────────────────
  {
    id: "sellos",
    nombre: "Sellos",
    descripcion: "Protocolo VVTT: ver, verificar, jalar y girar",
    grupo: "cierre",
    critica: false,
    porUnidad: true,
  },
  {
    id: "agricola",
    nombre: "Seguridad agrícola",
    descripcion: "Revisión de contaminación externa e interna",
    grupo: "cierre",
    critica: false,
  },
  {
    id: "estado-salida",
    nombre: "Estado al salir",
    descripcion: "Cómo se retira la unidad",
    grupo: "cierre",
    critica: false,
  },
  {
    id: "revision",
    nombre: "Revisión",
    descripcion: "Repaso de todo lo capturado antes de cerrar",
    grupo: "cierre",
    critica: false,
  },
  {
    id: "comentarios",
    nombre: "Comentarios",
    descripcion: "Observaciones adicionales",
    grupo: "cierre",
    critica: false,
  },
  {
    id: "firmas",
    nombre: "Firmas",
    descripcion: "Inspector y conductor",
    grupo: "cierre",
    critica: true,
  },
];

export const FASES_POR_ID = new Map(FASES.map((f) => [f.id, f]));

export const NOMBRES_GRUPO: Record<GrupoFase, string> = {
  preparacion: "Preparación",
  unidad: "Datos de la unidad",
  "inspeccion-fisica": "Inspección física",
  cierre: "Cierre",
};
