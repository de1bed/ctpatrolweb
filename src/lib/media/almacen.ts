"use client";

import Dexie, { type Table } from "dexie";

/**
 * Almacén local de evidencia.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * En la app anterior las fotos se guardaban como rutas `file://` dentro del
 * estado persistido. En web el equivalente sería una URL `blob:`, que muere
 * en cuanto se recarga la pestaña: el inspector recarga y su inspección queda
 * con huecos donde había fotos.
 *
 * Aquí se guarda el BLOB completo en IndexedDB. Sobrevive a recargas, a
 * cierres del navegador y a quedarse sin señal. La foto existe en el teléfono
 * desde el instante en que se toma, y la subida es un detalle posterior que
 * puede fallar y reintentarse sin perder nada.
 *
 * localStorage no sirve para esto: tope de ~5 MB y solo texto. Una sola
 * inspección con 41 fotos lo revienta.
 */

export type EstadoSubida = "pendiente" | "subiendo" | "subida" | "fallida";

export type TipoMedia = "foto" | "video";

export type FotoLocal = {
  /** Generado en el dispositivo. Es la identidad de la foto desde que nace. */
  clientId: string;
  /**
   * Foto o video. El protocolo VVTT de sellos exige un clip corto jalando y
   * girando: una foto no prueba que se hizo la maniobra.
   */
  tipo: TipoMedia;
  inspeccionId: string;
  /** Paso del flujo al que pertenece (ej. "tractor-visual", "sellos#2"). */
  paso: string;
  /** Punto de inspección dentro del paso. */
  puntoClave: string;
  puntoNombre: string;

  blob: Blob;
  mimeType: string;
  ancho: number;
  alto: number;
  /** Solo para video. */
  duracionSegundos?: number;

  /** Metadatos que hacen de la foto una evidencia y no solo una imagen. */
  capturadaEn: string;
  latitud: number | null;
  longitud: number | null;

  estado: EstadoSubida;
  intentos: number;
  ultimoError: string | null;
  storagePath: string | null;
};

class BaseLocal extends Dexie {
  fotos!: Table<FotoLocal, string>;

  constructor() {
    super("ctpatrol");
    this.version(1).stores({
      // clientId es la llave; los demás son índices para consultar por
      // inspección, por paso y por lo que falta subir.
      fotos: "clientId, inspeccionId, paso, estado, [inspeccionId+paso]",
    });

    // v2 agrega el tipo (foto o video). Los registros que ya existían son
    // fotos: el video se introdujo después, así que la migración solo tiene
    // que ponerles la etiqueta que les corresponde.
    this.version(2)
      .stores({
        fotos: "clientId, inspeccionId, paso, estado, tipo, [inspeccionId+paso]",
      })
      .upgrade((tx) =>
        tx
          .table<FotoLocal>("fotos")
          .toCollection()
          .modify((f) => {
            f.tipo ??= "foto";
          })
      );
  }
}

/**
 * La base se abre de forma perezosa. Si se instanciara al importar el módulo,
 * un render en el servidor tronaría: en Node no existe IndexedDB.
 */
let baseCache: BaseLocal | null = null;

function base(): BaseLocal {
  if (typeof window === "undefined") {
    throw new Error("El almacén local solo existe en el navegador.");
  }
  baseCache ??= new BaseLocal();
  return baseCache;
}

export async function guardarFoto(
  foto: Omit<FotoLocal, "estado" | "intentos" | "ultimoError" | "storagePath" | "tipo"> & {
    tipo?: TipoMedia;
  }
): Promise<FotoLocal> {
  const completa: FotoLocal = {
    tipo: "foto",
    ...foto,
    estado: "pendiente",
    intentos: 0,
    ultimoError: null,
    storagePath: null,
  };
  await base().fotos.put(completa);
  avisarEvidenciaNueva();
  return completa;
}

/** El uploader escucha esto para no esperar al latido de 45 s. */
export const EVENTO_EVIDENCIA_NUEVA = "ctpatrol:evidencia-nueva";

export function avisarEvidenciaNueva() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_EVIDENCIA_NUEVA));
}

export async function fotosDePaso(
  inspeccionId: string,
  paso: string
): Promise<FotoLocal[]> {
  return base()
    .fotos.where("[inspeccionId+paso]")
    .equals([inspeccionId, paso])
    .toArray();
}

export async function fotosDeInspeccion(inspeccionId: string): Promise<FotoLocal[]> {
  return base().fotos.where("inspeccionId").equals(inspeccionId).toArray();
}

export async function borrarFoto(clientId: string): Promise<void> {
  await base().fotos.delete(clientId);
}

export async function actualizarEstado(
  clientId: string,
  cambios: Partial<Pick<FotoLocal, "estado" | "intentos" | "ultimoError" | "storagePath">>
): Promise<void> {
  await base().fotos.update(clientId, cambios);
}

/** Lo que falta por subir, en orden de captura. */
export async function pendientesDeSubida(): Promise<FotoLocal[]> {
  const fotos = await base()
    .fotos.where("estado")
    .anyOf(["pendiente", "fallida"])
    .toArray();
  return fotos.sort((a, b) => a.capturadaEn.localeCompare(b.capturadaEn));
}

/**
 * Limpia lo ya subido de una inspección.
 *
 * Solo borra lo que tiene confirmación del servidor. Una inspección completa
 * puede pasar de 100 MB en el dispositivo, y no liberarlo acaba llenando la
 * cuota del navegador — que cuando se agota, falla la siguiente escritura y
 * el inspector pierde una foto justo cuando menos lo espera.
 */
export async function liberarSubidas(inspeccionId: string): Promise<number> {
  const subidas = await base()
    .fotos.where("inspeccionId")
    .equals(inspeccionId)
    .filter((f) => f.estado === "subida")
    .toArray();

  await base().fotos.bulkDelete(subidas.map((f) => f.clientId));
  return subidas.length;
}

/** Cuánto espacio queda. Sirve para avisar antes de que truene. */
export async function espacioDisponible(): Promise<{
  usadoMb: number;
  disponibleMb: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    usadoMb: Math.round(usage / 1_048_576),
    disponibleMb: Math.round((quota - usage) / 1_048_576),
  };
}
