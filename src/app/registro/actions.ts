"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { enviarBienvenida } from "@/lib/email/mensajes";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Alta de una empresa nueva.
 *
 * Crea el tenant y al primer administrador. El resto del equipo lo da de
 * alta ese admin desde el panel. El perfil lo materializa el trigger
 * `handle_new_user` a partir del metadata que escribe el RPC.
 */

const esquema = z
  .object({
    empresa: z
      .string()
      .trim()
      .min(2, "Escribe el nombre de la empresa")
      .max(120, "El nombre de la empresa es demasiado largo"),
    nombre: z
      .string()
      .trim()
      .min(2, "Escribe tu nombre")
      .max(200, "El nombre es demasiado largo"),
    email: z
      .string()
      .trim()
      .min(1, "Escribe tu correo")
      .email("Ese correo no parece válido"),
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

export type EstadoRegistro = { error: string | null };

export async function registrarEmpresa(
  _anterior: EstadoRegistro,
  formData: FormData
): Promise<EstadoRegistro> {
  const datos = esquema.safeParse({
    empresa: formData.get("empresa"),
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_empresa", {
    p_email: datos.data.email,
    p_password: datos.data.password,
    p_full_name: datos.data.nombre,
    p_company_name: datos.data.empresa,
  });

  if (error) {
    if (error.message.includes("Ya existe")) {
      return {
        error: "Ya existe un usuario con ese correo. Entra o recupera tu contraseña.",
      };
    }
    console.error("No se pudo registrar la empresa", error);
    return { error: error.message || "No se pudo crear la cuenta." };
  }

  const { error: errorLogin } = await supabase.auth.signInWithPassword({
    email: datos.data.email,
    password: datos.data.password,
  });

  if (errorLogin) {
    return {
      error: "La cuenta se creó, pero no se pudo entrar. Prueba desde Iniciar sesión.",
    };
  }

  await enviarBienvenida({
    to: datos.data.email,
    nombre: datos.data.nombre,
    empresa: datos.data.empresa,
    urlEntrar: `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login`,
  });

  redirect("/");
}
