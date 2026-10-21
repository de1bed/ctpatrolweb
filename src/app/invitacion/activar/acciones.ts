"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const esquemaActivar = z
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

export type EstadoActivar = { error: string | null };

export async function activarCuenta(
  _anterior: EstadoActivar,
  formData: FormData
): Promise<EstadoActivar> {
  const datos = esquemaActivar.safeParse({
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
      error: "El enlace ya no es válido. Pide a tu administrador que te envíe otro.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: datos.data.password,
  });

  if (error) {
    console.error("No se pudo activar la cuenta", error);
    return { error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };
  }

  redirect("/");
}
