import "server-only";

import type { Persona } from "@/lib/inspection/colectiva";
import type { createClient } from "@/lib/supabase/server";

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * ¿Es colectiva? Ante cualquier error responde que no: así, si la migración
 * 0019 no estuviera aplicada, todo sigue funcionando como inspección normal.
 */
export async function esColectiva(supabase: ClienteSupabase, inspeccionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("inspections")
    .select("is_collective")
    .eq("id", inspeccionId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.is_collective);
}

/** Quién trabajó en la inspección y dónde está ahora. Null si no se pudo leer. */
export async function leerParticipantes(
  supabase: ClienteSupabase,
  inspeccionId: string
): Promise<Persona[] | null> {
  const { data, error } = await supabase.rpc("participantes_inspeccion", { p_id: inspeccionId });
  if (error || !data) {
    if (error) console.error("No se pudieron leer los participantes", error);
    return null;
  }
  return data.map((p) => ({
    perfilId: p.perfil_id,
    nombre: p.nombre,
    fases: p.fases,
    fotos: p.fotos,
    pasoActual: p.paso_actual,
  }));
}

/**
 * Quién ocupa un paso ahora mismo, si no soy yo. La tabla la lee cualquiera
 * que vea la inspección; el nombre sale de participantes_inspeccion.
 */
export async function ocupanteDePaso(
  supabase: ClienteSupabase,
  inspeccionId: string,
  clavePaso: string,
  yoId: string
): Promise<string | null> {
  const personas = await leerParticipantes(supabase, inspeccionId);
  const otro = personas?.find((p) => p.pasoActual === clavePaso && p.perfilId !== yoId);
  return otro?.nombre ?? null;
}
