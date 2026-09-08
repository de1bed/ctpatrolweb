"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { TABLAS, type TipoCatalogo } from "./config";

export type Resultado = { ok: true } | { ok: false; error: string };

const esquema = z.object({
  tipo: z.enum(["clientes", "conductores", "tractores", "contenedores"]),
  id: z.string().uuid().optional(),
  principal: z.string().trim().min(1, "Este campo es obligatorio").max(200),
  secundario: z.string().trim().max(200).optional(),
});

/**
 * Alta o edición de un registro de catálogo desde el panel.
 *
 * Lo que da de alta un admin siempre queda permanente: el trigger de la base
 * lo fuerza según el rol, no según lo que mande este código.
 */
export async function guardarCatalogo(entrada: unknown): Promise<Resultado> {
  const sesion = await requerirAdmin();

  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, error: validado.error.issues[0].message };
  }
  const { tipo, id, principal, secundario } = validado.data;
  const cfg = TABLAS[tipo];

  const supabase = await createClient();

  const fila = {
    [cfg.principal]: principal,
    [cfg.secundario]: secundario || null,
  };

  const { error } = id
    ? await supabase.from(cfg.tabla).update(fila as never).eq("id", id)
    : await supabase
        .from(cfg.tabla)
        .insert({
          ...fila,
          company_account_id: sesion.companyAccountId,
        } as never);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un registro con ese nombre." };
    }
    console.error("No se pudo guardar el catálogo", error);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/admin/catalogos");
  return { ok: true };
}

/**
 * Da de baja un registro.
 *
 * Es baja lógica, no borrado: las inspecciones históricas apuntan a estos
 * registros, y borrarlos dejaría expedientes señalando a la nada. Al
 * desactivarlo deja de aparecer en el buscador de campo, que es lo que se
 * quiere en la práctica.
 */
export async function desactivarCatalogo(
  tipo: TipoCatalogo,
  id: string,
  activo: boolean
): Promise<Resultado> {
  await requerirAdmin();

  const cfg = TABLAS[tipo];
  if (!cfg) return { ok: false, error: "Catálogo inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from(cfg.tabla)
    .update({ is_active: activo } as never)
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar." };

  revalidatePath("/admin/catalogos");
  return { ok: true };
}

/**
 * Convierte en permanente un registro que un inspector creó como efímero.
 *
 * Es el camino de "el inspector capturó bien este conductor, quédatelo".
 * Sin esto, un dato correcto capturado en campo se perdería del catálogo y
 * habría que reescribirlo desde el panel.
 */
export async function persistirEfimero(
  tipo: TipoCatalogo,
  id: string
): Promise<Resultado> {
  await requerirAdmin();

  const cfg = TABLAS[tipo];
  const supabase = await createClient();

  const { error } = await supabase
    .from(cfg.tabla)
    .update({ is_ephemeral: false } as never)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Ya existe un registro permanente con ese nombre.",
      };
    }
    return { ok: false, error: "No se pudo conservar el registro." };
  }

  revalidatePath("/admin/catalogos");
  return { ok: true };
}
