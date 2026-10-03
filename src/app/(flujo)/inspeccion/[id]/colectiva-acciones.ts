"use server";

import { z } from "zod";

import { requerirSesion } from "@/lib/auth";
import type { Persona } from "@/lib/inspection/colectiva";
import { leerParticipantes } from "@/lib/inspecciones/colectiva";
import { createClient } from "@/lib/supabase/server";

/**
 * Acciones del teléfono en una inspección colectiva: ocupar la fase en la
 * que se está, soltarla al salir y saber dónde están los demás.
 */

const id = z.string().uuid();
const paso = z.string().min(1).max(64);

export type ResultadoFase =
  | { ok: true; ocupada: false }
  | { ok: true; ocupada: true; nombre: string }
  | { ok: false };

/** Ocupa la fase o renueva el latido. Si otra persona la tiene, dice quién. */
export async function tomarFase(inspeccionId: string, clavePaso: string): Promise<ResultadoFase> {
  await requerirSesion();
  if (!id.safeParse(inspeccionId).success || !paso.safeParse(clavePaso).success) {
    return { ok: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("tomar_fase_inspeccion", { p_id: inspeccionId, p_paso: clavePaso })
    .maybeSingle();

  if (error || !data) return { ok: false };
  return data.ocupada
    ? { ok: true, ocupada: true, nombre: data.holder_nombre ?? "Otra persona" }
    : { ok: true, ocupada: false };
}

/** Suelta la fase indicada, o todas las mías si no se indica. */
export async function soltarFase(inspeccionId: string, clavePaso?: string): Promise<void> {
  await requerirSesion();
  if (!id.safeParse(inspeccionId).success) return;
  if (clavePaso !== undefined && !paso.safeParse(clavePaso).success) return;

  const supabase = await createClient();
  await supabase.rpc("soltar_fase_inspeccion", {
    p_id: inspeccionId,
    p_paso: clavePaso ?? null,
  });
}

export type EstadoColectiva = { yoId: string; personas: Persona[] } | null;

/** Quién participa y dónde está cada quien ahora. */
export async function estadoColectiva(inspeccionId: string): Promise<EstadoColectiva> {
  const sesion = await requerirSesion();
  if (!id.safeParse(inspeccionId).success) return null;

  const supabase = await createClient();
  const personas = await leerParticipantes(supabase, inspeccionId);
  return personas ? { yoId: sesion.userId, personas } : null;
}
