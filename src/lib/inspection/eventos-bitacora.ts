import "server-only";

import { requerirSesion } from "@/lib/auth";
import { comoObjeto } from "@/lib/inspection/bitacora";
import { leerParticipantes, nombresDePerfiles } from "@/lib/inspecciones/colectiva";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type EventoBitacora = {
  id: number;
  event: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  actor: string;
};

type Fila = {
  id: number;
  event: string;
  payload: Json;
  occurred_at: string;
  actor_id: string | null;
  profiles: { full_name: string } | null;
};

/**
 * La bitácora, en orden, con los nombres ya resueltos.
 *
 * Un inspector no puede leer el perfil de sus compañeros: los nombres que
 * falten se buscan entre quienes participaron y, si no, en la empresa.
 */
export async function leerEventosBitacora(inspeccionId: string): Promise<{
  eventos: EventoBitacora[];
  nombre: (id: unknown) => string | null;
}> {
  const sesion = await requerirSesion();
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspection_events")
    .select(
      "id, event, payload, occurred_at, actor_id, profiles!inspection_events_actor_id_fkey(full_name)"
    )
    .eq("inspection_id", inspeccionId)
    .order("occurred_at", { ascending: true })
    .limit(500);

  const filas = (data ?? []) as unknown as Fila[];
  const nombres = new Map<string, string>();
  for (const e of filas) {
    if (e.actor_id && e.profiles?.full_name) nombres.set(e.actor_id, e.profiles.full_name);
  }

  const mencionados = filas.flatMap((e) => {
    const p = comoObjeto(e.payload) ?? {};
    return [e.actor_id, p.de, p.a, p.asignadaA].filter(
      (x): x is string => typeof x === "string" && x.length > 0
    );
  });

  if (mencionados.some((id) => !nombres.has(id))) {
    const participantes = await leerParticipantes(supabase, inspeccionId);
    for (const p of participantes ?? []) nombres.set(p.perfilId, p.nombre);
    const faltan = mencionados.filter((id) => !nombres.has(id));
    const extra = await nombresDePerfiles(faltan, sesion.companyAccountId);
    for (const [id, n] of extra) nombres.set(id, n);
  }

  const nombre = (id: unknown) => (typeof id === "string" ? (nombres.get(id) ?? null) : null);

  return {
    nombre,
    eventos: filas.map((e) => ({
      id: e.id,
      event: e.event,
      payload: comoObjeto(e.payload) ?? {},
      occurredAt: e.occurred_at,
      actor: nombre(e.actor_id) ?? "Sistema",
    })),
  };
}
