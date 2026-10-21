"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * El registro público está DESHABILITADO.
 *
 * Las empresas se crean manualmente por Vortex (SQL/panel Supabase).
 * Los usuarios se dan de alta por invitación desde el panel de admin.
 * Estas acciones solo existen para compatibilidad; registrarEmpresa y
 * reenviarVerificacion siempre rechazan. confirmarCorreo sigue funcionando
 * para usuarios existentes que aún no hayan confirmado su correo.
 */

const REGISTRO_CERRADO_ERROR =
  "El registro público está deshabilitado. El acceso es solo por invitación. Contacta a tu empresa para obtener acceso.";

export type EstadoRegistro = {
  error: string | null;
  pendiente?: boolean;
  reenviado?: boolean;
  email?: string;
  nombre?: string;
  empresa?: string;
};

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
  _formData: FormData
): Promise<EstadoRegistro> {
  return { error: REGISTRO_CERRADO_ERROR };
}

export async function reenviarVerificacion(
  _anterior: EstadoRegistro,
  _formData: FormData
): Promise<EstadoRegistro> {
  return { error: REGISTRO_CERRADO_ERROR };
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
