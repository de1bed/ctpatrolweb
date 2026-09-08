"use server";

import { redirect } from "next/navigation";

import { obtenerPermisos, requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCreacion = { error: string } | never;

/**
 * Crea una inspección y lleva a su primera fase.
 *
 * El folio NO se genera aquí: lo pone un trigger en Postgres al insertar.
 * Generarlo en el cliente o en el servidor de la app abre la puerta a que dos
 * inspectores capturando al mismo tiempo se lleven el mismo número, que es
 * justo lo que pasaba en el sistema anterior.
 */
export async function crearInspeccion(): Promise<ResultadoCreacion> {
  const sesion = await requerirSesion();
  const permisos = await obtenerPermisos(sesion);

  if (!permisos.puedeIniciarInspeccion) {
    return { error: "No tienes permiso para iniciar inspecciones." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspections")
    .insert({
      company_account_id: sesion.companyAccountId,
      status: "in_progress",
      // Quien la arranca queda como responsable y como autor. RLS se apoya en
      // estos dos campos para decidir quién puede verla y editarla.
      assigned_to: sesion.userId,
      created_by: sesion.userId,
      started_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    console.error("No se pudo crear la inspección", error);
    return { error: "No se pudo crear la inspección. Intenta de nuevo." };
  }

  await supabase.from("inspection_events").insert({
    inspection_id: data.id,
    actor_id: sesion.userId,
    event: "started",
  });

  // Directo a la primera fase: el índice no aporta nada cuando está vacío.
  redirect(`/inspeccion/${data.id}/configuracion`);
}
