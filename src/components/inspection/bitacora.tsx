import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { FASES_POR_ID } from "@/lib/inspection/fases";
import { faseIdDeClave } from "@/lib/inspection/flujo";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function comoObjeto(valor: Json): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }
  return {};
}

function nombrePaso(clave: unknown): string | null {
  if (typeof clave !== "string" || !clave) return null;
  return FASES_POR_ID.get(faseIdDeClave(clave))?.nombre ?? clave;
}

function describir(evento: string, payload: Record<string, unknown>): string {
  switch (evento) {
    case "started":
      return "Inició la inspección";
    case "paused":
      return "Pausó la inspección";
    case "resumed":
      return "Reanudó la inspección";
    case "phase_completed": {
      const fase = nombrePaso(payload.paso);
      return fase ? `Completó ${fase}` : "Completó una fase";
    }
    case "completed":
      return payload.aprobada === false
        ? "Cerró la inspección · rechazada"
        : "Cerró la inspección · aprobada";
    case "cancelled": {
      const motivo =
        typeof payload.motivo === "string" ? payload.motivo.trim() : "";
      return motivo ? `Canceló la inspección · ${motivo}` : "Canceló la inspección";
    }
    case "assigned":
      return "Asignó la inspección";
    case "unassigned":
      return "Quitó la asignación";
    case "created_by_admin":
      return "La creó desde el panel";
    case "scheduled":
      return "La programó en el calendario";
    case "verification_revoked":
      return "Revocó el QR de verificación";
    default:
      return evento.replace(/_/g, " ");
  }
}

/**
 * Bitácora de la inspección.
 *
 * Append-only: dice quién hizo qué y cuándo. Es lo que permite reconstruir
 * una reclamación meses después, cuando ya nadie recuerda el turno.
 */
export async function Bitacora({ inspeccionId }: { inspeccionId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspection_events")
    .select(
      "id, event, payload, occurred_at, profiles!inspection_events_actor_id_fkey(full_name)"
    )
    .eq("inspection_id", inspeccionId)
    .order("occurred_at", { ascending: true })
    .limit(200);

  type Fila = {
    id: number;
    event: string;
    payload: Json;
    occurred_at: string;
    profiles: { full_name: string } | null;
  };
  const eventos = (data ?? []) as unknown as Fila[];
  if (eventos.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
        <ScrollText className="size-5 text-ink-muted" aria-hidden />
        Bitácora
      </h2>
      <Card className="overflow-hidden">
        <ol className="divide-y divide-line">
          {eventos.map((e) => {
            const actor = e.profiles?.full_name ?? "Sistema";
            return (
              <li key={e.id} className="px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  {describir(e.event, comoObjeto(e.payload))}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {actor}
                  {" · "}
                  {format(new Date(e.occurred_at), "d MMM yyyy, HH:mm", {
                    locale: es,
                  })}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
