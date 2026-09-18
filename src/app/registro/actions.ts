"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  enviarCodigoVerificacion,
  esCorreoYaConfirmado,
  puedeEnviarVerificacion,
} from "@/lib/email/verificacion";
import { createClient } from "@/lib/supabase/server";

/**
 * Alta de una empresa nueva.
 *
 * Crea el tenant y al primer administrador, pero NO inicia sesión: el correo
 * queda sin confirmar hasta que escriben el código que manda Resend. El
 * perfil lo materializa el trigger `handle_new_user` a partir del metadata
 * del RPC.
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

export type EstadoRegistro = {
  error: string | null;
  pendiente?: boolean;
  reenviado?: boolean;
  email?: string;
  nombre?: string;
  empresa?: string;
};

const esquemaReenvio = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo")
    .email("Ese correo no parece válido"),
  nombre: z.string().trim().optional(),
  empresa: z.string().trim().optional(),
});

const esquemaCodigo = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo")
    .email("Ese correo no parece válido"),
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, "El código tiene 6 u 8 dígitos"),
});

function pendiente(
  datos: { email: string; nombre?: string; empresa?: string },
  extra?: { reenviado?: boolean; error?: string | null }
): EstadoRegistro {
  return {
    error: extra?.error ?? null,
    pendiente: true,
    reenviado: extra?.reenviado,
    email: datos.email,
    nombre: datos.nombre,
    empresa: datos.empresa,
  };
}

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

  if (!puedeEnviarVerificacion()) {
    return {
      error:
        "No se pudo enviar el código de verificación. Inténtalo más tarde.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_empresa", {
    p_email: datos.data.email,
    p_password: datos.data.password,
    p_full_name: datos.data.nombre,
    p_company_name: datos.data.empresa,
  });

  const destino = {
    email: datos.data.email,
    nombre: datos.data.nombre,
    empresa: datos.data.empresa,
  };

  if (error) {
    if (error.message.includes("Ya existe")) {
      const envio = await enviarCodigoVerificacion(destino);
      if (envio.ok) return pendiente(destino);
      if (esCorreoYaConfirmado(envio.error)) {
        return {
          error:
            "Ya existe un usuario con ese correo. Entra o recupera tu contraseña.",
        };
      }
      return {
        error:
          "No se pudo enviar el código de verificación. Inténtalo de nuevo en unos minutos.",
      };
    }
    console.error("No se pudo registrar la empresa", error);
    return { error: error.message || "No se pudo crear la cuenta." };
  }

  const envio = await enviarCodigoVerificacion(destino);
  if (!envio.ok) {
    return {
      error:
        "La cuenta se creó, pero no se pudo enviar el código. Espera un minuto e inténtalo de nuevo.",
    };
  }

  return pendiente(destino);
}

export async function reenviarVerificacion(
  _anterior: EstadoRegistro,
  formData: FormData
): Promise<EstadoRegistro> {
  const datos = esquemaReenvio.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre") || undefined,
    empresa: formData.get("empresa") || undefined,
  });

  if (!datos.success) {
    return { error: datos.error.issues[0].message };
  }

  const envio = await enviarCodigoVerificacion(datos.data);
  if (!envio.ok && esCorreoYaConfirmado(envio.error)) {
    return {
      error: "Ese correo ya está confirmado. Entra con tu contraseña.",
    };
  }

  // Siempre "pendiente": no confirmamos si el correo existe.
  return pendiente(datos.data, { reenviado: true });
}

export async function confirmarCorreo(
  _anterior: EstadoRegistro,
  formData: FormData
): Promise<EstadoRegistro> {
  const email = String(formData.get("email") ?? "");
  const nombre = String(formData.get("nombre") ?? "") || undefined;
  const empresa = String(formData.get("empresa") ?? "") || undefined;
  const contexto = { email, nombre, empresa };

  const datos = esquemaCodigo.safeParse({
    email: formData.get("email"),
    codigo: String(formData.get("codigo") ?? "").replace(/\s/g, ""),
  });

  if (!datos.success) {
    return pendiente(contexto, { error: datos.error.issues[0].message });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: datos.data.email,
    token: datos.data.codigo,
    type: "invite",
  });

  if (error) {
    return pendiente(contexto, {
      error: "Ese código no es válido o ya caducó. Pide uno nuevo.",
    });
  }

  redirect("/");
}
