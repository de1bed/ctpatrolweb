"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

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

  // Solo rutas internas: un `volver` con http:// externo convertiría el
  // login en un trampolín para mandar gente a un sitio de phishing.
  const destino =
    datos.data.volver?.startsWith("/") && !datos.data.volver.startsWith("//")
      ? datos.data.volver
      : "/";

  redirect(destino);
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
