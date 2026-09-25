import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/server";

const DIAS = 30;

/** Borra de verdad las inspecciones cuya retención de 30 días ya venció. */
export async function purgarInspeccionesExpiradas(): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  const limite = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data: vencidas } = await admin
    .from("inspections")
    .select("id")
    .lt("deleted_at", limite)
    .limit(40);

  const ids = (vencidas ?? []).map((v) => v.id);
  if (ids.length === 0) return;

  const { data: media } = await admin
    .from("inspection_media")
    .select("storage_path")
    .in("inspection_id", ids);

  const rutas = (media ?? [])
    .map((m) => m.storage_path)
    .filter((p): p is string => Boolean(p));

  if (rutas.length > 0) {
    await admin.storage.from("inspection-media").remove(rutas);
  }

  await admin.from("inspections").delete().in("id", ids);
}
