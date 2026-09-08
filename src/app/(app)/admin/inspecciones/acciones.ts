"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type Resultado = { ok: true; id?: string } | { ok: false; error: string };

const esquemaAsignacion = z.object({
  inspeccionId: z.string().uuid(),
  inspectorId: z.string().uuid().nullable(),
});

/**
 * Asigna o reasigna una inspección.
 *
 * Reasignar una inspección ya empezada es legítimo —el turno cambió, el
 * inspector se enfermó— pero no es gratuito: la evidencia que el primero
 * capturó y todavía no subió vive en SU dispositivo, no en el servidor.
 * Por eso queda registrado en la bitácora quién reasignó y a quién.
 */
export async function asignarInspeccion(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquemaAsignacion.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Datos inválidos." };
  const { inspeccionId, inspectorId } = validado.data;

  const supabase = await createClient();

  // El destinatario debe existir, estar activo y ser de esta cuenta. RLS ya
  // lo impediría, pero sin esta comprobación el error sería un fallo mudo de
  // política en vez de un mensaje entendible.
  if (inspectorId) {
    const { data: destino } = await supabase
      .from("profiles")
      .select("id, is_active, company_account_id")
      .eq("id", inspectorId)
      .maybeSingle();

    if (!destino || !destino.is_active) {
      return { ok: false, error: "Ese usuario no está disponible." };
    }
    if (destino.company_account_id !== sesion.companyAccountId) {
      return { ok: false, error: "Ese usuario no pertenece a tu cuenta." };
    }
  }

  const { data: actual } = await supabase
    .from("inspections")
    .select("id, status, assigned_to")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!actual) return { ok: false, error: "No se encontró la inspección." };

  if (actual.status === "completed" || actual.status === "cancelled") {
    return { ok: false, error: "Una inspección cerrada ya no se reasigna." };
  }

  const { error } = await supabase
    .from("inspections")
    .update({
      assigned_to: inspectorId,
      assigned_by: sesion.userId,
      assigned_at: inspectorId ? new Date().toISOString() : null,
      // Una inspección sin asignar vuelve a borrador; con inspector pasa a
      // asignada, salvo que ya estuviera en curso o pausada.
      ...(actual.status === "draft" && inspectorId
        ? { status: "assigned" as const }
        : {}),
      ...(!inspectorId && actual.status === "assigned"
        ? { status: "draft" as const }
        : {}),
    })
    .eq("id", inspeccionId);

  if (error) {
    console.error("No se pudo asignar", error);
    return { ok: false, error: "No se pudo asignar la inspección." };
  }

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: inspectorId ? "assigned" : "unassigned",
    payload: { de: actual.assigned_to, a: inspectorId } as Json,
  });

  revalidatePath("/admin/inspecciones");
  return { ok: true };
}

const esquemaNueva = z.object({
  inspectorId: z.string().uuid().nullable(),
  clienteNombre: z.string().trim().max(200).optional(),
  programadaPara: z.string().datetime().nullable().optional(),
});

/**
 * Crea una inspección desde el panel y la asigna.
 *
 * El folio lo pone el trigger de Postgres, igual que cuando la crea un
 * inspector: un solo camino de generación, imposible que se dupliquen.
 */
export async function crearAsignada(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquemaNueva.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Datos inválidos." };
  const { inspectorId, clienteNombre, programadaPara } = validado.data;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspections")
    .insert({
      company_account_id: sesion.companyAccountId,
      status: inspectorId ? ("assigned" as const) : ("draft" as const),
      assigned_to: inspectorId,
      assigned_by: inspectorId ? sesion.userId : null,
      assigned_at: inspectorId ? new Date().toISOString() : null,
      scheduled_for: programadaPara ?? null,
      customer_name: clienteNombre || null,
      created_by: sesion.userId,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    console.error("No se pudo crear la inspección", error);
    return { ok: false, error: "No se pudo crear la inspección." };
  }

  await supabase.from("inspection_events").insert({
    inspection_id: data.id,
    actor_id: sesion.userId,
    event: "created_by_admin",
    payload: { asignadaA: inspectorId } as Json,
  });

  revalidatePath("/admin/inspecciones");
  return { ok: true, id: data.id };
}

/**
 * Cancela una inspección.
 *
 * No se borra: el expediente y su evidencia se conservan. Una inspección
 * cancelada también es información —dice que una unidad llegó y no se pudo
 * revisar— y borrarla dejaría un hueco inexplicable en la numeración.
 */
export async function cancelarInspeccion(
  inspeccionId: string,
  motivo: string
): Promise<Resultado> {
  const sesion = await requerirAdmin();

  if (!motivo.trim()) {
    return { ok: false, error: "Escribe el motivo de la cancelación." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inspections")
    .update({ status: "cancelled" })
    .eq("id", inspeccionId);

  if (error) return { ok: false, error: "No se pudo cancelar." };

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: "cancelled",
    payload: { motivo: motivo.trim() } as Json,
  });

  revalidatePath("/admin/inspecciones");
  return { ok: true };
}
