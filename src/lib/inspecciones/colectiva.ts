import "server-only";

import {
  enVivo,
  unidos,
  type Integrante,
  type Persona,
} from "@/lib/inspection/colectiva";
import { tryCreateAdminClient, type createClient } from "@/lib/supabase/server";

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

/**
 * Nombres de perfiles de la empresa.
 *
 * Un inspector no puede leer el perfil de sus compañeros (profiles_select),
 * pero sí necesita saber quién es el encargado o quién hizo un cambio. Se
 * leen con la llave de servicio, solo `full_name` y solo de la empresa de la
 * sesión: nunca nombres de otra empresa.
 */
export async function nombresDePerfiles(
  ids: (string | null | undefined)[],
  companyAccountId: string
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;

  const admin = tryCreateAdminClient();
  if (!admin) return mapa;

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unicos)
    .eq("company_account_id", companyAccountId);

  for (const p of data ?? []) {
    mapa.set(p.id, p.full_name?.trim() || p.email);
  }
  return mapa;
}

/** Quién encabeza, quién empezó y quién se sumó a una inspección. */
export type Equipo = {
  encargado: Integrante | null;
  /** Quien hizo el primer movimiento: la creó o guardó la primera fase. */
  inicio: (Integrante & { en: string }) | null;
  /** Participantes sin contar al encargado. */
  unidos: Persona[];
  /** Todos los que participan, encargado incluido, con su fase actual. */
  personas: Persona[];
  enVivo: boolean;
};

/**
 * Arma el equipo de una inspección. Null si no se pudo leer: quien lo use
 * debe seguir funcionando sin esta información.
 */
export async function leerEquipo(
  supabase: ClienteSupabase,
  inspeccion: { id: string; assigned_to: string | null },
  companyAccountId: string
): Promise<Equipo | null> {
  const [personas, { data: primero }] = await Promise.all([
    leerParticipantes(supabase, inspeccion.id),
    supabase
      .from("inspection_events")
      .select("actor_id, occurred_at")
      .eq("inspection_id", inspeccion.id)
      .in("event", ["started", "phase_completed"])
      .not("actor_id", "is", null)
      .order("occurred_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!personas) return null;

  const conocidos = new Map(personas.map((p) => [p.perfilId, p.nombre]));
  const faltan = [inspeccion.assigned_to, primero?.actor_id].filter(
    (id): id is string => Boolean(id) && !conocidos.has(id!)
  );
  const extra = await nombresDePerfiles(faltan, companyAccountId);
  const nombre = (id: string) => conocidos.get(id) ?? extra.get(id) ?? "Sin nombre";

  return {
    encargado: inspeccion.assigned_to
      ? { id: inspeccion.assigned_to, nombre: nombre(inspeccion.assigned_to) }
      : null,
    inicio: primero?.actor_id
      ? { id: primero.actor_id, nombre: nombre(primero.actor_id), en: primero.occurred_at }
      : null,
    unidos: unidos(personas, inspeccion.assigned_to),
    personas,
    enVivo: enVivo(personas),
  };
}

/** Resumen corto del equipo para las tarjetas de las listas. */
export type EquipoTarjeta = {
  encargado: string | null;
  unidos: string[];
  enVivo: boolean;
};

/**
 * Equipos de las colectivas de una lista. Se consulta una por una: son pocas
 * a la vez, y la función de participantes ya valida el acceso de cada una.
 */
export async function equiposParaTarjetas(
  supabase: ClienteSupabase,
  inspecciones: { id: string; is_collective?: boolean | null; assigned_to?: string | null }[],
  companyAccountId: string
): Promise<Record<string, EquipoTarjeta>> {
  const colectivas = inspecciones.filter((i) => i.is_collective);
  const equipos = await Promise.all(
    colectivas.map((i) =>
      leerEquipo(supabase, { id: i.id, assigned_to: i.assigned_to ?? null }, companyAccountId)
    )
  );
  const resultado: Record<string, EquipoTarjeta> = {};
  colectivas.forEach((i, n) => {
    const e = equipos[n];
    if (!e) return;
    resultado[i.id] = {
      encargado: e.encargado?.nombre ?? null,
      unidos: e.unidos.map((p) => p.nombre),
      enVivo: e.enVivo,
    };
  });
  return resultado;
}
