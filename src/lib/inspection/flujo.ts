import {
  FASES,
  FASES_POR_ID,
  type ContextoFase,
  type DefinicionFase,
  type FaseId,
} from "./fases";
import { numeroDeUnidades, type TipoTransporte } from "./transporte";

/**
 * Motor de flujo.
 *
 * Recibe el estado de una inspección y responde las preguntas que toda la
 * app necesita: qué pantallas aplican, cuál sigue, cuánto lleva, si ya se
 * puede pausar. Ninguna pantalla contesta esto por su cuenta.
 *
 * Es una función pura sobre datos: sin React, sin base de datos, sin fetch.
 * Por eso se puede probar de verdad — ver `flujo.test.ts`.
 */

export type EstadoFlujo = {
  tipoTransporte: TipoTransporte | null;
  esFull: boolean;
  /** Claves de paso ya terminadas. Ver `clavePaso`. */
  completados: string[];
};

/**
 * Un paso concreto del flujo.
 *
 * Una fase marcada `porUnidad` genera un paso por cada caja de un full, así
 * que "fase" y "paso" no son lo mismo: `inspeccion-externa` es una fase, pero
 * en un full son dos pasos.
 */
export type Paso = {
  /** Única en el flujo. Es lo que se guarda en `progress.completados`. */
  clave: string;
  fase: DefinicionFase;
  /** 1 o 2 cuando la fase se repite por unidad; null si no se repite. */
  unidad: number | null;
  /** Etiqueta ya resuelta, con el número de caja si aplica. */
  titulo: string;
  completado: boolean;
};

export type Flujo = {
  pasos: Paso[];
  /** Fases que se omitieron, con el motivo, para poder explicarlo en la UI. */
  omitidas: { fase: DefinicionFase; razon: string }[];
  totalPasos: number;
  completados: number;
  porcentaje: number;
  /** Siguiente paso sin terminar, o null si ya no queda ninguno. */
  siguiente: Paso | null;
  /** Pasos críticos que faltan. Mientras no esté vacío, el flujo va guiado. */
  criticosPendientes: Paso[];
  /**
   * Con los críticos listos, el inspector puede saltar entre pantallas y
   * pausar. Antes no: pausar sin saber el tipo de transporte deja una
   * inspección que al retomarse no sabe qué pantallas le tocan.
   */
  navegacionLibre: boolean;
  puedePausar: boolean;
};

/**
 * Separador entre la fase y el número de unidad.
 *
 * Es "~" y NO "#" por una razón concreta: la clave viaja en la URL de la
 * pantalla (/inspeccion/<id>/<clave>), y "#" es el separador de fragmento.
 * El navegador cortaría ahí y el servidor recibiría "sellos" en vez de
 * "sellos#2", que no es una clave válida y rebota al índice — o sea, las
 * fases por unidad serían inalcanzables.
 *
 * "~" es un carácter no reservado en URLs: viaja tal cual, sin escapar.
 */
const SEPARADOR_UNIDAD = "~";

/** Clave estable de un paso. Se persiste, así que su formato no debe cambiar. */
export function clavePaso(faseId: FaseId, unidad: number | null): string {
  return unidad === null ? faseId : `${faseId}${SEPARADOR_UNIDAD}${unidad}`;
}

/** Extrae el id de fase de una clave de paso. */
export function faseIdDeClave(clave: string): FaseId {
  return clave.split(SEPARADOR_UNIDAD)[0] as FaseId;
}

function tituloPaso(fase: DefinicionFase, unidad: number | null, totalUnidades: number) {
  // Solo se numera cuando de verdad hay más de una; "Sellos · Caja 1" cuando
  // solo hay una caja es ruido que confunde.
  if (unidad === null || totalUnidades < 2) return fase.nombre;
  return `${fase.nombre} · Caja ${unidad}`;
}

export function construirFlujo(estado: EstadoFlujo): Flujo {
  const ctx: ContextoFase = {
    tipoTransporte: estado.tipoTransporte,
    esFull: estado.esFull,
  };

  const unidades = numeroDeUnidades(estado.tipoTransporte, estado.esFull);
  const completados = new Set(estado.completados);

  const pasos: Paso[] = [];
  const omitidas: Flujo["omitidas"] = [];

  for (const fase of FASES) {
    const aplica = fase.aplica ? fase.aplica(ctx) : true;

    if (!aplica) {
      omitidas.push({
        fase,
        razon: fase.razonNoAplica ?? "No aplica a este tipo de transporte",
      });
      continue;
    }

    // Una fase por unidad sin unidades que inspeccionar simplemente no
    // produce pasos. Pasa con van o pipa: no hay caja que sellar.
    if (fase.porUnidad) {
      if (unidades === 0) {
        omitidas.push({
          fase,
          razon: fase.razonNoAplica ?? "Esta unidad no lleva caja ni contenedor",
        });
        continue;
      }

      for (let u = 1; u <= unidades; u++) {
        const clave = clavePaso(fase.id, u);
        pasos.push({
          clave,
          fase,
          unidad: u,
          titulo: tituloPaso(fase, u, unidades),
          completado: completados.has(clave),
        });
      }
      continue;
    }

    const clave = clavePaso(fase.id, null);
    pasos.push({
      clave,
      fase,
      unidad: null,
      titulo: fase.nombre,
      completado: completados.has(clave),
    });
  }

  const hechos = pasos.filter((p) => p.completado).length;
  const criticosPendientes = pasos.filter((p) => p.fase.critica && !p.completado);
  const navegacionLibre = criticosPendientes.length === 0;

  return {
    pasos,
    omitidas,
    totalPasos: pasos.length,
    completados: hechos,
    porcentaje: pasos.length === 0 ? 0 : Math.round((hechos / pasos.length) * 100),
    siguiente: pasos.find((p) => !p.completado) ?? null,
    criticosPendientes,
    navegacionLibre,
    // Pausar exige los críticos listos. Si no, al retomar la inspección no
    // habría forma de saber qué pantallas le corresponden.
    puedePausar: navegacionLibre,
  };
}

/**
 * ¿Se puede abrir este paso?
 *
 * Antes de terminar los críticos el flujo va guiado: solo se abre el
 * siguiente pendiente, o algo ya terminado (para corregirlo). Después se
 * abre cualquiera — el inspector conoce su trabajo y a veces necesita
 * adelantarse porque el conductor ya se bajó o la caja llegó primero.
 */
export function puedeAbrir(flujo: Flujo, clave: string): boolean {
  const paso = flujo.pasos.find((p) => p.clave === clave);
  if (!paso) return false;
  if (paso.completado) return true;
  if (flujo.navegacionLibre) return true;
  return flujo.siguiente?.clave === clave;
}

/** Pasos agrupados para el índice, respetando el orden del catálogo. */
export function agruparPasos(flujo: Flujo) {
  const grupos = new Map<string, Paso[]>();
  for (const paso of flujo.pasos) {
    const lista = grupos.get(paso.fase.grupo) ?? [];
    lista.push(paso);
    grupos.set(paso.fase.grupo, lista);
  }
  return grupos;
}

export function faseDe(clave: string): DefinicionFase | undefined {
  return FASES_POR_ID.get(faseIdDeClave(clave));
}
