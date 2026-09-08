"use server";

import { z } from "zod";

import { obtenerPermisos, requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Búsqueda y alta de catálogo desde el flujo de inspección.
 *
 * La búsqueda va al servidor y no se filtra en el cliente: una cuenta con
 * miles de conductores no cabe en la memoria de un teléfono, y bajarla
 * completa por una red de patio sería lentísimo.
 */

export type TipoCatalogo = "cliente" | "conductor" | "tractor" | "contenedor";

export type ItemCatalogo = {
  id: string;
  etiqueta: string;
  detalle: string | null;
};

const TABLAS = {
  cliente: { tabla: "customers", campo: "name", extra: "tax_id" },
  conductor: { tabla: "drivers", campo: "name", extra: "license_number" },
  tractor: { tabla: "tractors", campo: "unit_number", extra: "plates" },
  contenedor: { tabla: "containers", campo: "number", extra: "plates" },
} as const;

export async function buscarCatalogo(
  tipo: TipoCatalogo,
  termino: string
): Promise<ItemCatalogo[]> {
  await requerirSesion();
  const supabase = await createClient();

  const cfg = TABLAS[tipo];
  if (!cfg) return [];

  // RLS ya limita a la cuenta del usuario, así que no hace falta filtrar por
  // company_account_id aquí.
  let consulta = supabase
    .from(cfg.tabla)
    .select(`id, ${cfg.campo}, ${cfg.extra}`)
    .eq("is_active", true)
    // Los efímeros no se ofrecen: nacieron para una inspección concreta y
    // reaparecer en el buscador de otra es justo lo que ensucia el catálogo.
    .eq("is_ephemeral", false)
    .order(cfg.campo)
    .limit(25);

  const limpio = termino.trim();
  if (limpio.length > 0) {
    // Se escapan los comodines de LIKE: un inspector que teclee "%" no debe
    // terminar trayéndose el catálogo completo.
    const seguro = limpio.replace(/[%_]/g, (m) => `\\${m}`);
    consulta = consulta.ilike(cfg.campo, `%${seguro}%`);
  }

  const { data, error } = await consulta;
  if (error || !data) return [];

  return (data as unknown as Record<string, string | null>[]).map((fila) => ({
    id: String(fila.id),
    etiqueta: String(fila[cfg.campo] ?? ""),
    detalle: fila[cfg.extra] ?? null,
  }));
}

const esquemaAlta = z.object({
  tipo: z.enum(["cliente", "conductor", "tractor", "contenedor"]),
  nombre: z.string().trim().min(1, "Escribe un nombre").max(200),
  detalle: z.string().trim().max(200).optional(),
});

export type ResultadoAlta =
  | { ok: true; item: ItemCatalogo }
  | { ok: false; error: string };

/**
 * Alta de un registro nuevo desde campo.
 *
 * El permiso se revisa aquí Y en la base (política RLS + trigger). Doble
 * revisión a propósito: la de aquí da un mensaje entendible, la de la base
 * es la que de verdad no se puede brincar.
 *
 * Si el registro queda permanente o efímero NO lo decide este código: lo
 * fuerza un trigger en Postgres según el permiso del inspector. Si se
 * decidiera aquí, bastaría con mandar otro valor para saltarse la regla.
 */
export async function crearEnCatalogo(
  entrada: z.infer<typeof esquemaAlta>
): Promise<ResultadoAlta> {
  const sesion = await requerirSesion();
  const permisos = await obtenerPermisos(sesion);

  const validado = esquemaAlta.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, error: validado.error.issues[0].message };
  }
  const { tipo, nombre, detalle } = validado.data;

  const permitido = {
    cliente: permisos.puedeCrearCliente,
    conductor: permisos.puedeCrearConductor,
    tractor: permisos.puedeCrearTractor,
    contenedor: permisos.puedeCrearContenedor,
  }[tipo];

  if (!permitido) {
    return {
      ok: false,
      error: "No tienes permiso para dar de alta aquí. Pídeselo a tu administrador.",
    };
  }

  const supabase = await createClient();

  const filas: Record<TipoCatalogo, Record<string, unknown>> = {
    cliente: { name: nombre, tax_id: detalle || null },
    conductor: { name: nombre, license_number: detalle || null },
    tractor: { unit_number: nombre, plates: detalle || null },
    contenedor: { number: nombre, plates: detalle || null },
  };

  const cfg = TABLAS[tipo];
  const { data, error } = await supabase
    .from(cfg.tabla)
    .insert({
      ...filas[tipo],
      company_account_id: sesion.companyAccountId,
    } as never)
    .select(`id, ${cfg.campo}, ${cfg.extra}`)
    .single();

  if (error || !data) {
    // 23505 = violación de índice único. Pasa cuando ya existe con ese
    // nombre; conviene decirlo en vez de un error genérico.
    if (error?.code === "23505") {
      return { ok: false, error: "Ya existe un registro con ese nombre." };
    }
    return { ok: false, error: "No se pudo guardar el registro." };
  }

  const fila = data as unknown as Record<string, string | null>;
  return {
    ok: true,
    item: {
      id: String(fila.id),
      etiqueta: String(fila[cfg.campo] ?? ""),
      detalle: fila[cfg.extra] ?? null,
    },
  };
}
