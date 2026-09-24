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

  const saldo = cuenta.creditos_ia + datos.data.creditos;
  const { error } = await supabase
    .from("company_accounts")
    .update({ creditos_ia: saldo })
    .eq("id", datos.data.empresaId);

  if (error) return { error: "No se pudieron agregar los créditos." };

  await supabase.from("ia_movimientos").insert({
    company_account_id: datos.data.empresaId,
    tipo: "recarga",
    creditos: datos.data.creditos,
    saldo,
    actor_id: sesion.userId,
    nota: datos.data.nota || "Recarga del super admin",
  });

  revalidatePath("/super");
  return { error: null, ok: `Se agregaron ${datos.data.creditos} créditos.` };
}
