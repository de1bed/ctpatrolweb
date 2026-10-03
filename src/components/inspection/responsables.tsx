import { Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { esParticipante } from "@/lib/inspection/colectiva";
import { FASES_POR_ID } from "@/lib/inspection/fases";
import { faseIdDeClave } from "@/lib/inspection/flujo";
import { esColectiva, leerParticipantes } from "@/lib/inspecciones/colectiva";
import { createClient } from "@/lib/supabase/server";

function nombrePaso(clave: string): string {
  return FASES_POR_ID.get(faseIdDeClave(clave))?.nombre ?? clave;
}

/**
 * Quién hizo qué en una inspección colectiva.
 *
 * Es el resumen que el admin necesita para asignar responsables: cada
 * persona con las fases que guardó y la evidencia que tomó. El detalle
 * minuto a minuto sigue en la bitácora.
 */
export async function Responsables({ inspeccionId }: { inspeccionId: string }) {
  const supabase = await createClient();
  if (!(await esColectiva(supabase, inspeccionId))) return null;

  const [personas, { data: eventos }] = await Promise.all([
    leerParticipantes(supabase, inspeccionId),
    supabase
      .from("inspection_events")
      .select("actor_id, payload")
      .eq("inspection_id", inspeccionId)
      .in("event", ["phase_completed", "completed"])
      .order("occurred_at", { ascending: true })
      .limit(500),
  ]);

  const participantes = (personas ?? []).filter(esParticipante);
  if (participantes.length === 0) return null;

  // Fases por persona, en el orden en que las guardó. Si dos personas
  // guardaron la misma fase, aparece en las dos: ambas respondieron por ella.
  const fasesDe = new Map<string, string[]>();
  for (const e of eventos ?? []) {
    const paso =
      e.payload && typeof e.payload === "object" && !Array.isArray(e.payload)
        ? (e.payload as Record<string, unknown>).paso
        : null;
    if (!e.actor_id || typeof paso !== "string") continue;
    const lista = fasesDe.get(e.actor_id) ?? [];
    const nombre = nombrePaso(paso);
    if (!lista.includes(nombre)) lista.push(nombre);
    fasesDe.set(e.actor_id, lista);
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
        <Users className="size-5 text-ink-muted" aria-hidden />
        Responsables
      </h2>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {participantes.map((p) => {
            const fases = fasesDe.get(p.perfilId) ?? [];
            return (
              <li key={p.perfilId} className="px-4 py-3">
                <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {fases.length} {fases.length === 1 ? "fase" : "fases"} · {p.fotos}{" "}
                  {p.fotos === 1 ? "evidencia" : "evidencias"}
                </p>
                {fases.length > 0 && (
                  <p className="mt-1.5 text-sm text-ink-secondary">{fases.join(" · ")}</p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
