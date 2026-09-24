"use server";

import { revalidatePath } from "next/cache";

import { requerirSesion } from "@/lib/auth";
import { parsearCorreos } from "@/lib/email/parsear";
import { createClient } from "@/lib/supabase/server";

export type EstadoCorreos = { error: string | null; ok: boolean };

export async function guardarCorreosReporte(
  _anterior: EstadoCorreos,
  formData: FormData
): Promise<EstadoCorreos> {
  const sesion = await requerirSesion();
  const texto = String(formData.get("correos") ?? "");
  const correos = parsearCorreos(texto);

  const sucios = texto
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (sucios.length > 0 && correos.length !== sucios.length) {
    return {
      error: "Hay un correo que no parece válido. Revisa la lista.",
      ok: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ report_emails: correos })
    .eq("id", sesion.userId);

  if (error) {
    return { error: "No se pudieron guardar los correos.", ok: false };
  }

  revalidatePath("/ajustes");
  return { error: null, ok: true };
}

export type EstadoAjustes = { error: string | null };

export async function cambiarIaEmpresa(
  _anterior: EstadoAjustes,
  formData: FormData
): Promise<EstadoAjustes> {
  const sesion = await requerirSesion();
  if (!sesion.esAdmin) return { error: "Solo el administrador puede cambiar esto." };

  const activa = formData.get("activa") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_accounts")
    .update({ ia_activa: activa })
    .eq("id", sesion.companyAccountId);

  if (error) {
    return {
      error: error.message.includes("no está autorizada")
        ? "La IA no está autorizada para esta empresa."
        : "No se pudo cambiar el análisis con IA.",
    };
  }

  revalidatePath("/ajustes");
  return { error: null };
}
