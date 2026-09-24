"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EstadoPlataforma = { error: string | null; ok?: string };

const esquemaAutorizar = z.object({
  empresaId: z.string().uuid(),
  autorizada: z.enum(["true", "false"]),
});

const esquemaRecarga = z.object({
  empresaId: z.string().uuid(),
  creditos: z.coerce.number().int().min(1).max(100_000),
  sentido: z.enum(["sumar", "restar"]),
  nota: z.string().trim().max(200).optional(),
});

export async function autorizarIa(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const datos = esquemaAutorizar.safeParse({
    empresaId: formData.get("empresaId"),
    autorizada: formData.get("autorizada"),
  });
  if (!datos.success) return { error: "No se pudo actualizar la empresa." };

  const supabase = await createClient();
  const autorizada = datos.data.autorizada === "true";
  const { error } = await supabase
    .from("company_accounts")
    .update({
      ia_plataforma: autorizada,
      ...(autorizada ? {} : { ia_activa: false }),
    })
    .eq("id", datos.data.empresaId);

  if (error) return { error: "No se pudo cambiar la autorización de IA." };
  revalidatePath("/super");
  return { error: null, ok: autorizada ? "IA autorizada." : "IA retirada." };
}

export async function recargarCreditos(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  const sesion = await requerirSuperAdmin();
  const datos = esquemaRecarga.safeParse({
    empresaId: formData.get("empresaId"),
    creditos: formData.get("creditos"),
    sentido: formData.get("sentido"),
    nota: formData.get("nota") || undefined,
  });
  if (!datos.success) return { error: "Escribe una cantidad de créditos válida." };

  const supabase = await createClient();
  const { data: cuenta } = await supabase
    .from("company_accounts")
    .select("creditos_ia")
    .eq("id", datos.data.empresaId)
    .maybeSingle();

  if (!cuenta) return { error: "No se encontró la empresa." };

  const delta =
    datos.data.sentido === "restar" ? -datos.data.creditos : datos.data.creditos;
  const saldo = Math.max(0, cuenta.creditos_ia + delta);
  const aplicado = saldo - cuenta.creditos_ia;
  if (aplicado === 0) {
    return { error: "Esa empresa ya está en 0 créditos." };
  }

  const { error } = await supabase
    .from("company_accounts")
    .update({ creditos_ia: saldo })
    .eq("id", datos.data.empresaId);

  if (error) return { error: "No se pudieron actualizar los créditos." };

  await supabase.from("ia_movimientos").insert({
    company_account_id: datos.data.empresaId,
    tipo: "recarga",
    creditos: aplicado,
    saldo,
    actor_id: sesion.userId,
    nota:
      datos.data.nota ||
      (aplicado > 0 ? "Recarga del super admin" : "Ajuste del super admin"),
  });

  revalidatePath("/super");
  revalidatePath("/");
  return {
    error: null,
    ok:
      aplicado > 0
        ? `Quedaron ${saldo} créditos.`
        : `Se quitaron ${Math.abs(aplicado)}. Quedaron ${saldo}.`,
  };
}

const esquemaEmpresaActiva = z.object({
  empresaId: z.string().uuid(),
  activa: z.enum(["true", "false"]),
});

export async function cambiarEmpresaActiva(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const datos = esquemaEmpresaActiva.safeParse({
    empresaId: formData.get("empresaId"),
    activa: formData.get("activa"),
  });
  if (!datos.success) return { error: "No se pudo actualizar la empresa." };

  const supabase = await createClient();
  const activa = datos.data.activa === "true";
  const { error } = await supabase
    .from("company_accounts")
    .update({ is_active: activa })
    .eq("id", datos.data.empresaId);

  if (error) return { error: "No se pudo cambiar el estado de la empresa." };
  revalidatePath("/super");
  return {
    error: null,
    ok: activa
      ? "Empresa reactivada."
      : "Empresa suspendida. Su equipo ya no puede entrar.",
  };
}

const esquemaMiembro = z.object({
  miembroId: z.string().uuid(),
  activo: z.enum(["true", "false"]).optional(),
  rol: z.enum(["admin", "inspector"]).optional(),
});

export async function cambiarMiembro(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  const sesion = await requerirSuperAdmin();
  const datos = esquemaMiembro.safeParse({
    miembroId: formData.get("miembroId"),
    activo: formData.get("activo") || undefined,
    rol: formData.get("rol") || undefined,
  });
  if (!datos.success) return { error: "No se pudo actualizar a esa persona." };
  if (datos.data.miembroId === sesion.userId) {
    return { error: "No puedes cambiar tu propio acceso desde aquí." };
  }

  const supabase = await createClient();
  const { data: miembro } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", datos.data.miembroId)
    .maybeSingle();

  if (!miembro) return { error: "No se encontró a esa persona." };
  if (miembro.role === "super_admin") {
    return { error: "El acceso de un super admin no se cambia desde esta lista." };
  }

  const cambios: { is_active?: boolean; role?: "admin" | "inspector" } = {};
  if (datos.data.activo) cambios.is_active = datos.data.activo === "true";
  if (datos.data.rol) cambios.role = datos.data.rol;
  if (Object.keys(cambios).length === 0) return { error: "Nada que cambiar." };

  const { error } = await supabase
    .from("profiles")
    .update(cambios)
    .eq("id", datos.data.miembroId);

  if (error) return { error: "No se pudo actualizar a esa persona." };
  revalidatePath("/super");
  return { error: null, ok: "Persona actualizada." };
}
