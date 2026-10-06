import { Camera, Crown, ScrollText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import type { Cambio } from "@/lib/inspection/autoria";
import { FASES_POR_ID } from "@/lib/inspection/fases";
import { faseIdDeClave } from "@/lib/inspection/flujo";
import { leerParticipantes, nombresDePerfiles } from "@/lib/inspecciones/colectiva";
import { createClient } from "@/lib/supabase/server";
import { formatoEnZona } from "@/lib/zona";
import { zonaDelUsuario } from "@/lib/zona-servidor";
import type { Json } from "@/lib/supabase/database.types";

function comoObjeto(valor: Json): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }
  return {};
}

/** "Inspección externa · Caja 2": el paso, no solo la fase. */
function nombrePaso(clave: unknown): string | null {
  if (typeof clave !== "string" || !clave) return null;
  const fase = FASES_POR_ID.get(faseIdDeClave(clave))?.nombre ?? clave;
  const caja = clave.match(/~(\d+)$/)?.[1];
  return caja ? `${fase} · Caja ${caja}` : fase;
}

type Nombres = (id: unknown) => string | null;

function describir(evento: string, payload: Record<string, unknown>, nombre: Nombres): string {
  switch (evento) {
    case "started":
      return "Inició la inspección";
    case "paused":
      return "Pausó la inspección";
    case "resumed":
      return "Reanudó la inspección";
    case "phase_completed": {
      const fase = nombrePaso(payload.paso) ?? "una fase";
      if (payload.sinCambios) return `Revisó ${fase} sin cambios`;
      return payload.edicion ? `Editó ${fase}` : `Completó ${fase}`;
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
    case "lead_claimed":
      return "Quedó como encargado al empezar la inspección";
    case "assigned": {
      const de = nombre(payload.de);
      const a = nombre(payload.a);
      if (de && a) return `Cambió el encargado: de ${de} a ${a}`;
      return a ? `Asignó la inspección a ${a}` : "Asignó la inspección";
    }
    case "unassigned": {
      const de = nombre(payload.de);
      return de ? `Quitó la asignación a ${de}` : "Quitó la asignación";
    }
    case "created_by_admin": {
      const a = nombre(payload.asignadaA);
      const tipo = payload.colectiva ? "colectiva " : "";
      return a
        ? `La creó desde el panel como ${tipo}inspección con encargado ${a}`
        : `La creó desde el panel${tipo ? " como inspección colectiva" : ""}`;
    }
    case "scheduled": {
      const a = nombre(payload.a);
      return a ? `La programó en el calendario para ${a}` : "La programó en el calendario";
    }
    case "verification_revoked":
      return "Revocó el QR de verificación";
    default:
      return evento.replace(/_/g, " ");
  }
}

function leerCambios(payload: Record<string, unknown>): Cambio[] {
  const c = payload.cambios;
  if (!Array.isArray(c)) return [];
  return c.filter(
    (x): x is Cambio =>
      Boolean(x) && typeof x === "object" && (x.tipo === "punto" || x.tipo === "campo")
  );
}

function leerResumen(payload: Record<string, unknown>): string | null {
  const r = payload.resumen;
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  const partes = Object.entries(r as Record<string, unknown>)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([estado, n]) => `${n} ${estado}`);
  return partes.length ? partes.join(" · ") : null;
}

/** Una línea por cambio: qué valía, qué vale y de quién era. */
function LineaCambio({ cambio }: { cambio: Cambio }) {
  if (cambio.tipo === "campo") {
    return (
      <li>
        <span className="font-medium text-ink">{cambio.campo}:</span> {cambio.antes} →{" "}
        <span className="font-medium text-ink">{cambio.despues}</span>
      </li>
    );
  }
  return (
    <li>
      <span className="font-medium text-ink">{cambio.nombre}:</span>{" "}
      {cambio.antes ? (
        <>
          {cambio.antes} → <span className="font-medium text-ink">{cambio.despues}</span>
        </>
      ) : (
        <span className="font-medium text-ink">{cambio.despues}</span>
      )}
      {cambio.foto && (
        <span className="ml-1 inline-flex items-center gap-1 text-ink-muted">
          · <Camera className="size-3" aria-hidden /> foto nueva
        </span>
      )}
      {cambio.antesPor && (
        <span className="text-warn-700 dark:text-warn-500"> · antes de {cambio.antesPor}</span>
      )}
      {cambio.nota && <span className="block text-ink-muted">“{cambio.nota}”</span>}
    </li>
  );
}

/**
 * Bitácora de la inspección.
 *
 * Append-only: dice quién hizo qué y cuándo, y en cada edición qué cambió y
 * de quién era lo anterior. Es lo que permite reconstruir una reclamación
 * meses después, cuando ya nadie recuerda el turno.
 */
export async function Bitacora({ inspeccionId }: { inspeccionId: string }) {
  const sesion = await requerirSesion();
  const supabase = await createClient();
  const tz = await zonaDelUsuario();
  const { data } = await supabase
    .from("inspection_events")
    .select(
      "id, event, payload, occurred_at, actor_id, profiles!inspection_events_actor_id_fkey(full_name)"
    )
    .eq("inspection_id", inspeccionId)
    .order("occurred_at", { ascending: true })
    .limit(500);

  type Fila = {
    id: number;
    event: string;
    payload: Json;
    occurred_at: string;
    actor_id: string | null;
    profiles: { full_name: string } | null;
  };
  const eventos = (data ?? []) as unknown as Fila[];
  if (eventos.length === 0) return null;

  // Un inspector no puede leer el perfil de sus compañeros: los nombres que
  // falten se resuelven por los participantes y, si no, por la empresa.
  const nombres = new Map<string, string>();
  for (const e of eventos) {
    if (e.actor_id && e.profiles?.full_name) nombres.set(e.actor_id, e.profiles.full_name);
  }
  const mencionados = eventos.flatMap((e) => {
    const p = comoObjeto(e.payload);
    return [e.actor_id, p.de, p.a, p.asignadaA].filter(
      (x): x is string => typeof x === "string" && x.length > 0
    );
  });
  if (mencionados.some((id) => !nombres.has(id))) {
    const participantes = await leerParticipantes(supabase, inspeccionId);
    for (const p of participantes ?? []) nombres.set(p.perfilId, p.nombre);
    const faltan = mencionados.filter((id) => !nombres.has(id));
    const extra = await nombresDePerfiles(faltan, sesion.companyAccountId);
    for (const [id, n] of extra) nombres.set(id, n);
  }
  const nombre: Nombres = (id) => (typeof id === "string" ? (nombres.get(id) ?? null) : null);

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
        <ScrollText className="size-5 text-ink-muted" aria-hidden />
        Bitácora
      </h2>
      <Card className="overflow-hidden">
        <ol className="divide-y divide-line">
          {eventos.map((e) => {
            const payload = comoObjeto(e.payload);
            const actor = nombre(e.actor_id) ?? "Sistema";
            const cambios = leerCambios(payload);
            const resumen = leerResumen(payload);
            const esEdicion = Boolean(payload.edicion) && !payload.sinCambios;
            return (
              <li key={e.id} className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {e.event === "lead_claimed" && (
                    <Crown className="size-4 shrink-0 text-brand-600" aria-hidden />
                  )}
                  <span className={esEdicion ? "text-warn-700 dark:text-warn-500" : undefined}>
                    {describir(e.event, payload, nombre)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  <span className="font-semibold text-ink-secondary">{actor}</span>
                  {" · "}
                  {formatoEnZona(e.occurred_at, "d MMM yyyy, HH:mm:ss", tz)}
                </p>
                {resumen && (
                  <p className="mt-1 text-xs text-ink-secondary">Puntos: {resumen}</p>
                )}
                {cambios.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-line pl-3 text-xs text-ink-secondary">
                    {cambios.map((c, i) => (
                      <LineaCambio key={i} cambio={c} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
