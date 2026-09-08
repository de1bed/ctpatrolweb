import { z } from "zod";

import type { TablesUpdate } from "@/lib/supabase/database.types";

import type { FaseId } from "./fases";
import { TIPOS_TRANSPORTE } from "./transporte";
import { CALIFICACIONES } from "./puntos";

/**
 * Qué se guarda en cada fase, y dónde.
 *
 * Dos cosas por fase:
 *
 *   esquema     Valida lo que llega del navegador. TODO dato entrante se
 *               valida en el servidor. Lo que valida el formulario en el
 *               cliente es cortesía para el usuario, no seguridad: cualquiera
 *               puede mandar un POST a mano.
 *
 *   proyectar   Mapea los datos validados a columnas de `inspections`.
 *               Solo para lo que el admin filtra o reporta; el resto se queda
 *               en el JSONB de `data`. Ver el comentario de la migración 0003.
 */

const textoOpcional = z.string().trim().max(500).optional().or(z.literal(""));

// ── Esquemas por fase ────────────────────────────────────────────────────────

export const esquemaConfiguracion = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  horaEntrada: z.string().min(1, "Falta la hora de entrada"),
  latitud: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitud: z.coerce.number().min(-180).max(180).nullable().optional(),
  precision: z.coerce.number().nonnegative().nullable().optional(),
});

export const esquemaCliente = z.object({
  clienteId: z.string().uuid().nullable().optional(),
  clienteNombre: z.string().trim().min(1, "Selecciona o escribe el transportista").max(200),
});

export const esquemaTipoTransporte = z.object({
  tipo: z.enum(TIPOS_TRANSPORTE as [string, ...string[]]),
  esFull: z.coerce.boolean().default(false),
});

export const esquemaTamano = z.object({
  tamano: z.enum(["20", "40", "45", "48", "53"]),
});

export const esquemaMovimiento = z.object({
  movimiento: z.enum(["importacion", "exportacion", "local", "otro"]),
  movimientoOtro: textoOpcional,
}).refine(
  (d) => d.movimiento !== "otro" || (d.movimientoOtro ?? "").trim().length > 0,
  { message: "Describe el movimiento", path: ["movimientoOtro"] }
);

export const esquemaEstadoEntrada = z.object({
  estado: z.enum(["cargado", "vacio", "botando"]),
});

export const esquemaEstadoSalida = z.object({
  estado: z.enum(["cargado", "vacio", "botando"]),
});

export const esquemaDocumentos = z.object({
  factura: textoOpcional,
  billOfLading: textoOpcional,
  pedimento: textoOpcional,
  sellosFiscales: textoOpcional,
  otros: z
    .array(z.object({ titulo: z.string().trim().max(120), numero: z.string().trim().max(200) }))
    .max(20)
    .default([]),
});

export const esquemaConductor = z.object({
  conductorId: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(1, "Falta el nombre del conductor").max(200),
  licencia: textoOpcional,
});

export const esquemaTractor = z.object({
  tractorId: z.string().uuid().nullable().optional(),
  numero: z.string().trim().min(1, "Falta el número de unidad").max(60),
  placas: textoOpcional,
});

export const esquemaPlacasRemolque = z.object({
  contenedorId: z.string().uuid().nullable().optional(),
  numero: z.string().trim().min(1, "Falta el número").max(60),
  placas: textoOpcional,
});

/** Fases de inspección visual: una calificación por punto. */
export const esquemaVisual = z.object({
  puntos: z.record(
    z.string(),
    z.object({
      calificacion: z.enum(CALIFICACIONES),
      nota: textoOpcional,
      noAplica: z.boolean().default(false),
    })
  ),
});

export const esquemaSellos = z.object({
  sellos: z
    .array(
      z.object({
        numero: z.string().trim().min(1, "Falta el número de sello").max(60),
        ver: z.boolean().default(false),
        verificar: z.boolean().default(false),
        jalar: z.boolean().default(false),
        girar: z.boolean().default(false),
      })
    )
    .min(1, "Registra al menos un sello"),
});

export const esquemaTemperaturas = z.object({
  lecturas: z
    .array(
      z.object({
        ubicacion: z.string().trim().min(1, "Indica dónde se midió").max(120),
        // Texto y no número: los termómetros de patio dan lecturas como
        // "-18.5" pero también "-18 a -20", y forzar un número obligaría al
        // inspector a inventar precisión que no tiene.
        temperatura: z.string().trim().min(1, "Falta la lectura").max(40),
      })
    )
    .min(1, "Registra al menos una lectura"),
});

export const esquemaAgricola = z.object({
  externaLimpia: z.boolean(),
  externaNota: textoOpcional,
  internaLimpia: z.boolean(),
  internaNota: textoOpcional,
});

export const esquemaComentarios = z.object({
  comentarios: z
    .array(
      z.object({
        nombre: z.string().trim().max(120),
        cargo: z.string().trim().max(120),
        comentario: z.string().trim().min(1).max(2000),
      })
    )
    .max(20)
    .default([]),
});

export const esquemaFirmas = z.object({
  inspector: z.object({
    nombre: z.string().trim().min(1, "Falta el nombre del inspector").max(200),
    firma: z.string().min(1, "Falta la firma del inspector"),
  }),
  conductor: z.object({
    nombre: z.string().trim().min(1, "Falta el nombre del conductor").max(200),
    firma: z.string().min(1, "Falta la firma del conductor"),
  }),
});

/** Fases sin datos propios: solo se marcan como vistas. */
const esquemaVacio = z.object({});

export const ESQUEMAS: Record<FaseId, z.ZodTypeAny> = {
  configuracion: esquemaConfiguracion,
  cliente: esquemaCliente,
  "tipo-transporte": esquemaTipoTransporte,
  tamano: esquemaTamano,
  movimiento: esquemaMovimiento,
  "estado-entrada": esquemaEstadoEntrada,
  documentos: esquemaDocumentos,
  conductor: esquemaConductor,
  tractor: esquemaTractor,
  "tractor-visual": esquemaVisual,
  "inspeccion-interna": esquemaVisual,
  "placas-remolque": esquemaPlacasRemolque,
  "inspeccion-externa": esquemaVisual,
  pausa: esquemaVacio,
  temperaturas: esquemaTemperaturas,
  sellos: esquemaSellos,
  agricola: esquemaAgricola,
  "estado-salida": esquemaEstadoSalida,
  revision: esquemaVacio,
  comentarios: esquemaComentarios,
  firmas: esquemaFirmas,
};

// ── Proyección a columnas ────────────────────────────────────────────────────

type Proyeccion = (datos: Record<string, unknown>) => TablesUpdate<"inspections">;

/**
 * Cada entrada dice qué columnas de `inspections` toca esta fase.
 *
 * Las fases que no aparecen aquí solo escriben en `data`. Eso es lo normal:
 * la mayoría de lo que se captura se imprime en el reporte y ya, no se filtra
 * por ello en el panel.
 */
export const PROYECCIONES: Partial<Record<FaseId, Proyeccion>> = {
  configuracion: (d) => ({
    entered_at: new Date(String(d.horaEntrada)).toISOString(),
    latitude: (d.latitud as number | null) ?? null,
    longitude: (d.longitud as number | null) ?? null,
    location_accuracy: (d.precision as number | null) ?? null,
    location_captured: d.latitud != null && d.longitud != null,
  }),

  cliente: (d) => ({
    customer_id: (d.clienteId as string | null) ?? null,
    // Se guarda el nombre además del id: si mañana el admin corrige el
    // catálogo, el reporte histórico debe seguir diciendo lo que decía.
    customer_name: String(d.clienteNombre),
  }),

  "tipo-transporte": (d) => ({
    transport_type: d.tipo as TablesUpdate<"inspections">["transport_type"],
    is_full: Boolean(d.esFull),
  }),

  movimiento: (d) => ({
    movement: d.movimiento as TablesUpdate<"inspections">["movement"],
    movement_other: (d.movimientoOtro as string) || null,
  }),

  "estado-entrada": (d) => ({
    entry_status: d.estado as TablesUpdate<"inspections">["entry_status"],
  }),

  "estado-salida": (d) => ({
    exit_status: d.estado as TablesUpdate<"inspections">["exit_status"],
  }),

  conductor: (d) => ({
    driver_id: (d.conductorId as string | null) ?? null,
    driver_name: String(d.nombre),
  }),

  tractor: (d) => ({
    tractor_id: (d.tractorId as string | null) ?? null,
    tractor_number: String(d.numero),
  }),
};
