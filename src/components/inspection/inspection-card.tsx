import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/supabase/database.types";

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
};

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
}: {
  inspeccion: InspeccionResumen;
  mostrarResultado?: boolean;
}) {
  const fecha = inspeccion.completed_at ?? inspeccion.updated_at;
  const cerrada = inspeccion.status === "completed";

  return (
    <Link href={`/inspeccion/${inspeccion.id}`} className="block">
      <Card interactive className="flex items-center gap-3 p-4 hover:border-line-strong">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge estado={inspeccion.status} />

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

          <p className="mt-1 text-xs text-ink-muted">
            {cerrada
              ? format(new Date(fecha), "d 'de' MMMM, HH:mm", { locale: es })
              : formatDistanceToNow(new Date(fecha), {
                  addSuffix: true,
                  locale: es,
                })}
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
