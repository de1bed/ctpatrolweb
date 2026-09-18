"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { rutaInternaSegura } from "@/lib/auth-rutas";
import { enviarRecuperacion } from "@/lib/email/mensajes";
import { clientEnv, isResendConfigured } from "@/lib/env";
import { createClient, tryCreateAdminClient } from "@/lib/supabase/server";

/**
 * Inicio de sesión.
 *
 * Va como Server Action y no como llamada desde el navegador para que la
 * contraseña no viva en el estado de React ni quede en un devtools abierto.
 *
 * A diferencia del sistema anterior, no se pide "código de empresa" además
 * del correo: la cuenta a la que pertenece el usuario ya está en su perfil.
 * Pedirlo era un dato más que memorizar y una forma más de no poder entrar
 * un domingo a las 6 a.m., sin ganar nada de seguridad.
 */

const esquema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo")
    .email("Ese correo no parece válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
  volver: z.string().optional(),
});

export type EstadoLogin = { error: string | null };

export async function iniciarSesion(
  _anterior: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const datos = esquema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    volver: formData.get("volver") ?? undefined,
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.email,
    password: datos.data.password,
  });

  if (error) {
    // Mensaje genérico a propósito: distinguir "no existe ese correo" de
    // "contraseña incorrecta" le regala a un atacante la lista de quién
    // tiene cuenta. Al usuario legítimo no le sirve de nada la distinción.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(rutaInternaSegura(datos.data.volver));
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const esquemaRecuperar = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo")
    .email("Ese correo no parece válido"),
});

export type EstadoRecuperar = { error: string | null; enviado: boolean };

export async function pedirRecuperacion(
  _anterior: EstadoRecuperar,
  formData: FormData
): Promise<EstadoRecuperar> {
  const datos = esquemaRecuperar.safeParse({
    email: formData.get("email"),
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message, enviado: false };
  }

  const origen = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const admin = tryCreateAdminClient();

  if (isResendConfigured() && admin) {
    const { data } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: datos.data.email,
      options: {
        redirectTo: `${origen}/auth/callback?next=/recuperar/nueva`,
      },
    });

    const token = data?.properties?.hashed_token;
    if (token) {
      const url = `${origen}/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery&next=/recuperar/nueva`;
      const nombre =
        typeof data.user?.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : "";
      const envio = await enviarRecuperacion({
        to: datos.data.email,
        nombre,
        url,
      });
      if (!envio.ok) {
        return {
          error: "No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.",
          enviado: false,
        };
      }
    }

    return { error: null, enviado: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(datos.data.email, {
    redirectTo: `${origen}/auth/callback?next=/recuperar/nueva`,
  });

  if (error) {
    console.error("No se pudo enviar el correo de recuperación", error);
    return {
      error: "No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.",
      enviado: false,
    };
  }

  // Siempre "enviado": no confirmamos si el correo existe.
  return { error: null, enviado: true };
}

const esquemaNueva = z
  .object({
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmacion: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.password === d.confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

export type EstadoNueva = { error: string | null };

export async function guardarNuevaContrasena(
  _anterior: EstadoNueva,
  formData: FormData
): Promise<EstadoNueva> {
  const datos = esquemaNueva.safeParse({
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "El enlace ya no es válido. Pide uno nuevo desde recuperar contraseña.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: datos.data.password,
  });

  if (error) {
    return { error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };
  }

  redirect("/");
}

const esquemaCambio = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual"),
    password: z
      .string()
      .min(10, "La nueva contraseña debe tener al menos 10 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmacion: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((d) => d.password === d.confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  })
  .refine((d) => d.actual !== d.password, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["password"],
  });

export type EstadoCambio = { error: string | null; ok: boolean };

export async function cambiarContrasena(
  _anterior: EstadoCambio,
  formData: FormData
): Promise<EstadoCambio> {
  const datos = esquemaCambio.safeParse({
    actual: formData.get("actual"),
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message, ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tu sesión caducó. Vuelve a entrar.", ok: false };
  }

  const { error: errorActual } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: datos.data.actual,
  });

  if (errorActual) {
    return { error: "La contraseña actual no es correcta.", ok: false };
  }

  const { error } = await supabase.auth.updateUser({
    password: datos.data.password,
  });

  if (error) {
    return { error: "No se pudo cambiar la contraseña.", ok: false };
  }

  return { error: null, ok: true };
}
