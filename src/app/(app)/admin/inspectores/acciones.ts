"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { enviarAltaUsuario } from "@/lib/email/mensajes";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type Resultado =
  | { ok: true; correoEnviado?: boolean; errorCorreo?: string; urlEntrar?: string }
  | { ok: false; error: string };

/**
 * Permisos de campo de un inspector.
 *
 * Cada par es "¿puede darlo de alta?" y "¿lo que dé de alta se queda en el
 * catálogo?". Separarlos permite la postura intermedia que la operación
 * necesita: que el inspector no se atore en el patio, pero que un typo suyo
 * no ensucie el catálogo para siempre.
 */
const esquemaPermisos = z.object({
  profileId: z.string().uuid(),
  can_start_new_inspection: z.boolean(),
  can_create_customer: z.boolean(),
  customer_storage_mode: z.enum(["persist", "ephemeral"]),
  can_create_driver: z.boolean(),
  driver_storage_mode: z.enum(["persist", "ephemeral"]),
  can_create_tractor: z.boolean(),
  tractor_storage_mode: z.enum(["persist", "ephemeral"]),
  can_create_container: z.boolean(),
  container_storage_mode: z.enum(["persist", "ephemeral"]),
  can_edit_documents: z.boolean(),
  can_edit_movement_data: z.boolean(),
});

export async function guardarPermisos(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquemaPermisos.safeParse(entrada);
  if (!validado.success) return { ok: false, error: "Datos inválidos." };

  const { profileId, ...permisos } = validado.data;
  const supabase = await createClient();

  // RLS solo deja tocar permisos de perfiles de la misma cuenta; aquí se
  // comprueba antes para poder dar un mensaje entendible en vez de un error
  // silencioso de política.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, company_account_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!perfil || perfil.company_account_id !== sesion.companyAccountId) {
    return { ok: false, error: "Ese inspector no pertenece a tu cuenta." };
  }

  const { error } = await supabase
    .from("inspector_permissions")
    .update({ ...permisos, updated_by: sesion.userId })
    .eq("profile_id", profileId);

  if (error) {
    console.error("No se pudieron guardar los permisos", error);
    return { ok: false, error: "No se pudieron guardar los permisos." };
  }

  revalidatePath("/admin/inspectores");
  return { ok: true };
}

/**
 * Quita o reintegra a alguien del equipo.
 *
 * No se borra el usuario: sigue apareciendo como autor de sus inspecciones.
 * Borrarlo dejaría expedientes sin firmante. Al quitarlo, `obtenerSesion`
 * deja de reconocerlo y ya no entra.
 */
export async function cambiarActivo(
  profileId: string,
  activo: boolean
): Promise<Resultado> {
  const sesion = await requerirAdmin();

  if (profileId === sesion.userId) {
    return { ok: false, error: "No puedes quitarte a ti mismo del equipo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: activo })
    .eq("id", profileId)
    .eq("company_account_id", sesion.companyAccountId);

  if (error) return { ok: false, error: "No se pudo actualizar el usuario." };

  revalidatePath("/admin/inspectores");
  return { ok: true };
}

const esquemaAlta = z.object({
  email: z.string().trim().email("Correo inválido"),
  nombre: z.string().trim().min(1, "Falta el nombre").max(200),
  rol: z.enum(["inspector", "admin"]),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(72, "Máximo 72 caracteres"),
});

/**
 * Alta de usuario.
 *
 * Prefiere service role si está configurado. Si no, usa `admin_crear_usuario`,
 * un RPC que solo puede ejecutar un admin de la cuenta.
 *
 * El perfil NO se inserta aquí: lo crea el trigger `handle_new_user`.
 */
export async function crearUsuario(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquemaAlta.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, error: validado.error.issues[0].message };
  }
  const { email, nombre, rol, password } = validado.data;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  let userId: string | null = null;

  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        company_account_id: sesion.companyAccountId,
        role: rol,
        full_name: nombre,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return { ok: false, error: "Ya existe un usuario con ese correo." };
      }
      console.error("No se pudo crear el usuario", error);
      return { ok: false, error: "No se pudo crear el usuario." };
    }
    userId = data.user?.id ?? null;
  } else {
    // Sin service role: el RPC SECURITY DEFINER crea el usuario en Auth
    // con la cuenta del admin que está pidiendo el alta.
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_crear_usuario", {
      p_email: email,
      p_password: password,
      p_full_name: nombre,
      p_role: rol,
    });

    if (error) {
      if (error.message.includes("Ya existe")) {
        return { ok: false, error: "Ya existe un usuario con ese correo." };
      }
      console.error("No se pudo crear el usuario", error);
      return { ok: false, error: error.message || "No se pudo crear el usuario." };
    }
  }

  revalidatePath("/admin/inspectores");

  const urlEntrar = `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login`;

  const correo = await enviarAltaUsuario({
    to: email,
    nombre,
    empresa: sesion.cuenta.name,
    rol: rol === "admin" ? "administrador" : "inspector",
    email,
    password,
    urlEntrar,
    invitador: sesion.nombre,
  });

  if (!correo.ok) {
    console.error("No se pudo enviar la invitación", correo.error);
  }

  if (admin) {
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      userId =
        data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
          ?.id ?? null;
    }
    if (userId) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          company_account_id: sesion.companyAccountId,
          role: rol,
          full_name: nombre,
          invite_email_sent: correo.ok,
        },
      });
    }
  }

  return {
    ok: true,
    correoEnviado: correo.ok,
    errorCorreo: correo.ok ? undefined : correo.error,
    urlEntrar,
  };
}
