import { ChevronRight, Crown, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { FechaEnLista } from "@/components/ui/fecha-en-lista";
import { cn } from "@/lib/cn";
import type { EquipoTarjeta } from "@/lib/inspecciones/colectiva";
import type { Database } from "@/lib/supabase/database.types";

import { PastillaEnVivo } from "./equipo";
import { StatusBadge } from "./status-badge";

export type InspeccionResumen = {
  id: string;
  display_id: string;
  status: Database["public"]["Enums"]["inspection_status"];
  customer_name: string | null;
  tractor_number: string | null;
  updated_at: string;
  completed_at?: string | null;
  passed?: boolean | null;
  findings_count?: number;
  /** Abierta a toda la empresa: cualquiera del equipo puede sumarse. */
  is_collective?: boolean;
};

/** Marca de una inspección abierta a toda la empresa. */
export function EtiquetaColectiva() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-50 px-2.5 py-1 text-xs font-semibold leading-none text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      <Users className="size-3.5 shrink-0" aria-hidden />
      Colectiva
    </span>
  );
}

/**
 * Tarjeta de inspección.
 *
 * La misma en inicio, listado y expedientes: si el inspector aprende a leerla
 * una vez, la lee en todos lados. El folio va en monoespaciada porque se
 * compara carácter por carácter contra papeles y pantallas.
 */
export function InspectionCard({
  inspeccion,
  mostrarResultado = false,
  equipo,
}: {
  inspeccion: InspeccionResumen;
  mostrarResultado?: boolean;
  /** Colectivas: encargado, quiénes se unieron y si está en vivo. */
  equipo?: EquipoTarjeta;
}) {
  const fecha = inspeccion.completed_at ?? inspeccion.updated_at;
  const cerrada = inspeccion.status === "completed";
  const abierta = !cerrada && inspeccion.status !== "cancelled";
  const enVivo = Boolean(abierta && equipo?.enVivo);

  return (
    <Link href={`/inspeccion/${inspeccion.id}`} className="block">
      <Card interactive className="flex items-center gap-3 p-4 hover:border-line-strong">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {enVivo ? <PastillaEnVivo /> : <StatusBadge estado={inspeccion.status} />}

            {inspeccion.is_collective && <EtiquetaColectiva />}

            {mostrarResultado && cerrada && inspeccion.passed !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                  "text-xs font-semibold leading-none",
                  inspeccion.passed
                    ? "border-ok-500/40 bg-ok-50 text-ok-700 dark:bg-ok-500/10 dark:text-ok-500"
                    : "border-danger-500/40 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
                )}
              >
                {inspeccion.passed ? (
                  <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
                )}
                {inspeccion.passed ? "Aprobada" : "Rechazada"}
              </span>
            )}
          </div>

          <p className="mt-2 truncate text-base font-semibold text-ink">
            {inspeccion.customer_name ?? "Sin transportista"}
          </p>

          <p className="mt-0.5 truncate text-sm text-ink-secondary">
            <span className="font-mono">{inspeccion.display_id}</span>
            {inspeccion.tractor_number && ` · ${inspeccion.tractor_number}`}
          </p>

          {equipo && (
            <div className="mt-2 flex flex-col gap-0.5 text-sm">
              <p className="flex items-center gap-1.5 truncate text-ink">
                <Crown className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                <span className="text-ink-muted">Encargado:</span>
                <span className="truncate font-semibold">
                  {equipo.encargado ?? "quien la empiece"}
                </span>
              </p>
              {equipo.unidos.length > 0 && (
                <p className="flex items-center gap-1.5 text-ink-secondary">
                  <Users className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                  <span className="truncate">
                    {equipo.unidos.length === 1 ? "Se unió" : `Se unieron ${equipo.unidos.length}`}:{" "}
                    {equipo.unidos.join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}

          <p className="mt-1 text-xs text-ink-muted">
            <FechaEnLista iso={fecha} />
            {mostrarResultado &&
              (inspeccion.findings_count ?? 0) > 0 &&
              ` · ${inspeccion.findings_count} ${
                inspeccion.findings_count === 1 ? "hallazgo" : "hallazgos"
              }`}
          </p>
        </div>

        <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />
      </Card>
    </Link>
  );
}
