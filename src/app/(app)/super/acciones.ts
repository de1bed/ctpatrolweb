"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSuperAdmin } from "@/lib/auth";
import { createClient, tryCreateAdminClient } from "@/lib/supabase/server";

export type EstadoPlataforma = { error: string | null; ok?: string };

function refrescarPlataforma() {
  revalidatePath("/super");
  revalidatePath("/super/inspecciones");
}

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
  refrescarPlataforma();
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

  refrescarPlataforma();
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
  refrescarPlataforma();
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
  refrescarPlataforma();
  return { error: null, ok: "Persona actualizada." };
}

const esquemaNombreEmpresa = z.object({
  empresaId: z.string().uuid(),
  nombre: z.string().trim().min(2, "Escribe el nombre").max(120),
});

export async function renombrarEmpresa(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const datos = esquemaNombreEmpresa.safeParse({
    empresaId: formData.get("empresaId"),
    nombre: formData.get("nombre"),
  });
  if (!datos.success) return { error: "Escribe un nombre de empresa válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_accounts")
    .update({ name: datos.data.nombre })
    .eq("id", datos.data.empresaId);

  if (error) return { error: "No se pudo cambiar el nombre." };
  refrescarPlataforma();
  return { error: null, ok: "Nombre de la empresa actualizado." };
}

const esquemaNombrePersona = z.object({
  miembroId: z.string().uuid(),
  nombre: z.string().trim().min(2, "Escribe el nombre").max(120),
});

export async function renombrarPersona(
  _anterior: EstadoPlataforma,
  formData: FormData
): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const datos = esquemaNombrePersona.safeParse({
    miembroId: formData.get("miembroId"),
    nombre: formData.get("nombre"),
  });
  if (!datos.success) return { error: "Escribe un nombre válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: datos.data.nombre })
    .eq("id", datos.data.miembroId);

  if (error) return { error: "No se pudo cambiar el nombre." };
  refrescarPlataforma();
  return { error: null, ok: "Nombre actualizado." };
}

function mensajeBorrado(error: { message?: string } | null, fallback: string): string {
  const texto = error?.message ?? "";
  if (texto.includes("super admin")) return "No se puede borrar la cuenta de un super admin.";
  if (texto.includes("ti mismo")) return "No puedes borrarte a ti mismo.";
  if (texto.includes("No se encontró")) return "No se encontró esa cuenta.";
  return fallback;
}

async function rutasDeEvidencia(empresaId: string): Promise<string[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const rutas: string[] = [];
  let desde = 0;
  for (;;) {
    const { data } = await admin
      .from("inspection_media")
      .select("storage_path")
      .eq("company_account_id", empresaId)
      .range(desde, desde + 999);
    const filas = data ?? [];
    for (const fila of filas) {
      if (fila.storage_path) rutas.push(fila.storage_path);
    }
    if (filas.length < 1000) break;
    desde += 1000;
  }
  return rutas;
}

export async function eliminarEmpresa(empresaId: string): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const rutas = await rutasDeEvidencia(empresaId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_empresa_plataforma", { p_id: empresaId });
  if (error) return { error: mensajeBorrado(error, "No se pudo eliminar la empresa.") };

  const admin = tryCreateAdminClient();
  if (admin && rutas.length > 0) {
    for (let i = 0; i < rutas.length; i += 100) {
      await admin.storage.from("inspection-media").remove(rutas.slice(i, i + 100));
    }
  }

  refrescarPlataforma();
  return { error: null, ok: "Empresa eliminada. Esos correos ya pueden registrarse." };
}

export async function eliminarPersona(miembroId: string): Promise<EstadoPlataforma> {
  await requerirSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_persona_plataforma", { p_id: miembroId });
  if (error) return { error: mensajeBorrado(error, "No se pudo eliminar a esa persona.") };

  refrescarPlataforma();
  return { error: null, ok: "Persona eliminada. Ese correo ya puede registrarse." };
}
