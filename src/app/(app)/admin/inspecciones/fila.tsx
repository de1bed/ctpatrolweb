"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, ExternalLink, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/inspection/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/supabase/database.types";

import { asignarInspeccion, cancelarInspeccion } from "./acciones";

export type InspeccionAdmin = {
  id: string;
  display_id: string;
  status: Database["public"]["Enums"]["inspection_status"];
  customer_name: string | null;
  tractor_number: string | null;
  driver_name: string | null;
  updated_at: string;
  completed_at: string | null;
  scheduled_for: string | null;
  passed: boolean | null;
  findings_count: number;
  assigned_to: string | null;
  profiles: { id: string; full_name: string } | null;
};

export function FilaInspeccion({
  inspeccion,
  inspectores,
}: {
  inspeccion: InspeccionAdmin;
  inspectores: { id: string; nombre: string }[];
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const cerrada =
    inspeccion.status === "completed" || inspeccion.status === "cancelled";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge estado={inspeccion.status} />
            {inspeccion.status === "completed" && inspeccion.passed !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
                  inspeccion.passed
                    ? "border-ok-500/40 bg-ok-50 text-ok-700 dark:bg-ok-500/10 dark:text-ok-500"
                    : "border-danger-500/40 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
                )}
              >
                {inspeccion.passed ? (
                  <ShieldCheck className="size-3.5" aria-hidden />
                ) : (
                  <ShieldAlert className="size-3.5" aria-hidden />
                )}
                {inspeccion.passed ? "Aprobada" : "Rechazada"}
                {inspeccion.findings_count > 0 &&
                  ` · ${inspeccion.findings_count}`}
              </span>
            )}
          </div>

          <p className="mt-2 font-semibold text-ink">
            {inspeccion.customer_name ?? "Sin transportista"}
          </p>
          <p className="truncate text-sm text-ink-secondary">
            <span className="font-mono">{inspeccion.display_id}</span>
            {inspeccion.tractor_number && ` · ${inspeccion.tractor_number}`}
            {inspeccion.driver_name && ` · ${inspeccion.driver_name}`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {formatDistanceToNow(
              new Date(inspeccion.completed_at ?? inspeccion.updated_at),
              { addSuffix: true, locale: es }
            )}
          </p>
        </div>

        <Link
          href={`/inspeccion/${inspeccion.id}${cerrada ? "/reporte" : ""}`}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium text-ink-secondary transition-colors active:bg-surface-sunken"
        >
          <ExternalLink className="size-4" aria-hidden />
          {cerrada ? "Reporte" : "Abrir"}
        </Link>
      </div>

      {/* ── Asignación ───────────────────────────────────────────────── */}
      {!cerrada && (
        <div className="border-t border-line p-4">
          {error && (
            <p role="alert" className="mb-2 text-sm text-danger-600">
              {error}
            </p>
          )}

          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-secondary">
            <UserCog className="size-4 shrink-0" aria-hidden />
            Inspector asignado
          </label>

          <div className="flex flex-wrap gap-2">
            <Select
              value={inspeccion.assigned_to ?? ""}
              disabled={pendiente}
              className="min-w-0 flex-1"
              onChange={(e) => {
                const valor = e.target.value || null;
                empezar(async () => {
                  setError(null);
                  const r = await asignarInspeccion({
                    inspeccionId: inspeccion.id,
                    inspectorId: valor,
                  });
                  if (!r.ok) setError(r.error);
                });
              }}
            >
              <option value="">Sin asignar</option>
              {inspectores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </Select>

            <Button
              variant="ghost"
              className="shrink-0 text-danger-600"
              onClick={() => setCancelando((c) => !c)}
            >
              <Ban className="size-4" aria-hidden />
              Cancelar
            </Button>
          </div>

          {/* Cancelar exige motivo: sin él, meses después nadie sabe por qué
              hay un folio muerto en la numeración. */}
          {cancelando && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-danger-500/30 bg-danger-50 p-3 dark:bg-danger-500/10">
              <label className="text-sm font-medium text-ink">
                ¿Por qué se cancela?
              </label>
              <Textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. la unidad se retiró sin inspeccionar"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setCancelando(false);
                    setMotivo("");
                  }}
                >
                  No cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={pendiente}
                  disabled={!motivo.trim()}
                  onClick={() =>
                    empezar(async () => {
                      const r = await cancelarInspeccion(inspeccion.id, motivo);
                      if (r.ok) {
                        setCancelando(false);
                        setMotivo("");
                      } else setError(r.error);
                    })
                  }
                >
                  Cancelar inspección
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
