import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Deja el uso de IA en la bitácora.
 *
 * Si el insert falla, el inspector igual recibe el resultado: una nota que
 * no se pudo guardar no puede tumbar el análisis que ya se pagó.
 */
export async function anotarUsoIa(entrada: {
  inspectionId: string;
  actorId: string;
  event: "ai_analysis" | "ai_lectura" | "ai_ocr";
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("inspection_events").insert({
      inspection_id: entrada.inspectionId,
      actor_id: entrada.actorId,
      event: entrada.event,
      payload: entrada.payload as Json,
    });
    // El cliente no lanza: un rechazo de permisos llega en `error`.
    if (error) return;
  } catch {
    // Ver el comentario de arriba.
  }
}
