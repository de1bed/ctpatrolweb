import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/server";

export type FotoPublica = {
  url: string;
  punto: string;
  capturadaEn: string;
  tipo: "foto" | "video";
};

/**
 * Fotos del QR público.
 *
 * El bucket es privado: el token ya se validó con `verificar_inspeccion`.
 * Aquí se firman URLs cortas (30 min) para esa inspección y nada más.
 */
export async function fotosDeVerificacion(
  token: string
): Promise<FotoPublica[]> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error(
      "No se pueden firmar las fotos del QR: falta SUPABASE_SERVICE_ROLE_KEY"
    );
    return [];
  }

  const { data: inspeccion } = await admin
    .from("inspections")
    .select("id")
    .eq("verification_token", token)
    .eq("status", "completed")
    .is("deleted_at", null)
    .is("verification_revoked_at", null)
    .maybeSingle();

  if (!inspeccion) return [];

  const { data: media } = await admin
    .from("inspection_media")
    .select(
      "storage_path, point_label, point_key, phase, captured_at, kind"
    )
    .eq("inspection_id", inspeccion.id)
    .not("storage_path", "is", null)
    .in("kind", ["photo", "video"])
    .neq("phase", "documentos")
    .order("phase")
    .order("sort_order");

  const items = media ?? [];
  const rutas = items
    .map((m) => m.storage_path)
    .filter((p): p is string => Boolean(p));
  if (rutas.length === 0) return [];

  const { data: firmados, error } = await admin.storage
    .from("inspection-media")
    .createSignedUrls(rutas, 30 * 60);

  if (error) {
    console.error("No se pudieron firmar las fotos del QR", error);
    return [];
  }

  const urlPorRuta = new Map<string, string>();
  for (const f of firmados ?? []) {
    if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
  }

  return items.flatMap((m) => {
    const url = m.storage_path ? urlPorRuta.get(m.storage_path) : undefined;
    if (!url) return [];
    return [
      {
        url,
        punto: m.point_label ?? m.point_key ?? m.phase,
        capturadaEn: m.captured_at,
        tipo: m.kind === "video" ? ("video" as const) : ("foto" as const),
      },
    ];
  });
}
