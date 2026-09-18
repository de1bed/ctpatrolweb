import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/server";

export type DatoAuth = {
  ultimaEntrada: string | null;
  correoEnviado: boolean | null;
};

/**
 * last_sign_in_at vive en Auth, no en profiles. El admin client lo lee
 * para pintar "invitación enviada" vs "ya está dentro".
 */
export async function datosAuthDelEquipo(
  ids: string[]
): Promise<Map<string, DatoAuth>> {
  const mapa = new Map<string, DatoAuth>();
  if (ids.length === 0) return mapa;

  const admin = tryCreateAdminClient();
  if (!admin) return mapa;

  const buscados = new Set(ids);
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data) break;

    for (const u of data.users) {
      if (!buscados.has(u.id)) continue;
      const meta = u.user_metadata as Record<string, unknown> | undefined;
      mapa.set(u.id, {
        ultimaEntrada: u.last_sign_in_at ?? null,
        correoEnviado:
          typeof meta?.invite_email_sent === "boolean"
            ? meta.invite_email_sent
            : null,
      });
    }

    if (data.users.length < 200) break;
    page += 1;
  }

  return mapa;
}
