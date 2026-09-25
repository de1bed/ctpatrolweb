"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth";
import { armarPrecarga } from "@/lib/inspection/precarga";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type Resultado = { ok: true; id?: string } | { ok: false; error: string };

function refrescarListas() {
  revalidatePath("/admin/inspecciones");
  revalidatePath("/admin/calendario");
  revalidatePath("/inspecciones");
  revalidatePath("/");
}

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

  refrescarListas();
  return { ok: true };
}

const esquemaNueva = z.object({
  inspectorId: z.string().uuid().nullable(),
  clienteId: z.string().uuid().nullable().optional(),
  clienteNombre: z.string().trim().max(200).optional(),
  tractorId: z.string().uuid().nullable().optional(),
  tractorNumero: z.string().trim().max(80).optional(),
  tractorPlacas: z.string().trim().max(80).optional(),
  conductorId: z.string().uuid().nullable().optional(),
  conductorNombre: z.string().trim().max(200).optional(),
  conductorLicencia: z.string().trim().max(80).optional(),
  tipoTransporte: z
    .enum([
      "caja",
      "caja_refrigerada",
      "contenedor",
      "plataforma",
      "van",
      "rabon",
      "torton",
      "pipa",
      "lowboy",
    ])
    .nullable()
    .optional(),
  programadaPara: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)))
    .nullable()
    .optional(),
});

/**
 * Crea una inspección desde el panel, precargada y opcionalmente asignada.
 *
 * El folio lo pone el trigger de Postgres. Lo que el admin llena aquí
 * (transportista, unidad, fecha, inspector) lo ve el inspector al abrirla.
 */
export async function crearAsignada(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquemaNueva.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Datos inválidos." };
  const {
    inspectorId,
    clienteId,
    clienteNombre,
    tractorId,
    tractorNumero,
    tractorPlacas,
    conductorId,
    conductorNombre,
    conductorLicencia,
    tipoTransporte,
    programadaPara,
  } = validado.data;

  // El inspector lee las fases desde `data`, no desde las columnas. Si solo
  // llenáramos customer_name, abriría "Transportista" y lo vería vacío.
  const precarga = armarPrecarga({
    clienteId,
    clienteNombre,
    tractorId,
    tractorNumero,
    tractorPlacas,
    conductorId,
    conductorNombre,
    conductorLicencia,
    tipoTransporte,
  });

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
      customer_id: clienteId ?? null,
      customer_name: clienteNombre || null,
      tractor_id: tractorId ?? null,
      tractor_number: tractorNumero || null,
      driver_id: conductorId ?? null,
      driver_name: conductorNombre || null,
      transport_type: tipoTransporte ?? null,
      data: precarga as Json,
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
    payload: { asignadaA: inspectorId, cuando: programadaPara } as Json,
  });

  refrescarListas();
  return { ok: true, id: data.id };
}

const esquemaProgramar = z.object({
  inspeccionId: z.string().uuid(),
  inspectorId: z.string().uuid().nullable(),
  programadaPara: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)))
    .nullable(),
});

/** Cambia fecha o inspector de una inspección que todavía no se cierra. */
export async function programarInspeccion(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();
  const validado = esquemaProgramar.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Datos inválidos." };
  const { inspeccionId, inspectorId, programadaPara } = validado.data;

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("inspections")
    .select("id, status, assigned_to")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!actual) return { ok: false, error: "No se encontró la inspección." };
  if (actual.status === "completed" || actual.status === "cancelled") {
    return { ok: false, error: "Una inspección cerrada ya no se reprograma." };
  }

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

  const { error } = await supabase
    .from("inspections")
    .update({
      assigned_to: inspectorId,
      assigned_by: inspectorId ? sesion.userId : null,
      assigned_at: inspectorId ? new Date().toISOString() : null,
      scheduled_for: programadaPara,
      ...(actual.status === "draft" && inspectorId
        ? { status: "assigned" as const }
        : {}),
      ...(!inspectorId && actual.status === "assigned"
        ? { status: "draft" as const }
        : {}),
    })
    .eq("id", inspeccionId);

  if (error) return { ok: false, error: "No se pudo reprogramar." };

  await supabase.from("inspection_events").insert({
    inspection_id: inspeccionId,
    actor_id: sesion.userId,
    event: "scheduled",
    payload: {
      de: actual.assigned_to,
      a: inspectorId,
      cuando: programadaPara,
    } as Json,
  });

  refrescarListas();
  return { ok: true };
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

  refrescarListas();
  return { ok: true };
}

/** Baja lógica. La empresa deja de verla; el super admin la conserva 30 días. */
export async function eliminarInspeccion(inspeccionId: string): Promise<Resultado> {
  await requerirAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("eliminar_inspeccion_empresa", {
    p_id: inspeccionId,
  });

  if (error) return { ok: false, error: "No se pudo eliminar." };

  refrescarListas();
  revalidatePath("/super/inspecciones");
  return { ok: true };
}
