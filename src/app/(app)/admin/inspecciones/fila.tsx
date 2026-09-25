"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, ExternalLink, ShieldAlert, ShieldCheck, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/inspection/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { aDatetimeLocal, fechaEnLista } from "@/lib/calendario";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/supabase/database.types";

import {
  asignarInspeccion,
  cancelarInspeccion,
  eliminarInspeccion,
  programarInspeccion,
} from "./acciones";
import { RevocarQr } from "@/app/(flujo)/inspeccion/[id]/reporte/revocar";

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
  verification_token: string | null;
  verification_revoked_at: string | null;
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
  const [pasoEliminar, setPasoEliminar] = useState<0 | 1 | 2>(0);
  const [motivo, setMotivo] = useState("");

  const cerrada =
    inspeccion.status === "completed" || inspeccion.status === "cancelled";

  const avisoEliminar =
    pasoEliminar === 1
      ? "¿Seguro que deseas eliminar esta inspección?"
      : "La guardaremos durante 30 días. Después de ese tiempo será imposible recuperarla. ¿Seguro que deseas eliminar?";

  return (
    <>
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
            {inspeccion.scheduled_for && (
              <>
                Programada{" "}
                {format(new Date(inspeccion.scheduled_for), "d MMM, HH:mm", {
                  locale: es,
                })}
                {" · "}
              </>
            )}
            {fechaEnLista(inspeccion.completed_at ?? inspeccion.updated_at)}
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

      {error && (
        <p role="alert" className="border-t border-line px-4 pt-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      {/* ── Asignación ───────────────────────────────────────────────── */}
      {!cerrada && (
        <div className="border-t border-line p-4">

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

          <Field
            label="En el calendario"
            hint="Si le pones fecha, aparece en el calendario del inspector."
            className="mt-3"
          >
            {(p) => (
              <Input
                {...p}
                key={inspeccion.scheduled_for ?? "sin-fecha"}
                type="datetime-local"
                disabled={pendiente}
                defaultValue={
                  inspeccion.scheduled_for
                    ? aDatetimeLocal(new Date(inspeccion.scheduled_for))
                    : ""
                }
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) {
                    return;
                  }
                  empezar(async () => {
                    setError(null);
                    const r = await programarInspeccion({
                      inspeccionId: inspeccion.id,
                      inspectorId: inspeccion.assigned_to,
                      programadaPara: valor
                        ? new Date(valor).toISOString()
                        : null,
                    });
                    if (!r.ok) setError(r.error);
                  });
                }}
              />
            )}
          </Field>

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

      <div className="border-t border-line px-4 py-3">
        <Button variant="secondary" onClick={() => setPasoEliminar(1)}>
          <Trash2 className="size-4" aria-hidden />
          Eliminar
        </Button>
      </div>

      {inspeccion.status === "completed" &&
        inspeccion.verification_token &&
        !inspeccion.verification_revoked_at && (
          <div className="border-t border-line px-4 py-3">
            <RevocarQr inspeccionId={inspeccion.id} />
          </div>
        )}
    </Card>

    {pasoEliminar > 0 && (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute inset-0 bg-black/60"
          onClick={() => {
            if (!pendiente) setPasoEliminar(0);
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-eliminar-${inspeccion.id}`}
          className="relative w-full rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
        >
          <h2 id={`titulo-eliminar-${inspeccion.id}`} className="text-xl font-bold text-ink">
            Eliminar inspección
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{avisoEliminar}</p>
          {error && pasoEliminar === 2 && (
            <p role="alert" className="mt-3 text-sm text-danger-600">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={pendiente}
              onClick={() => setPasoEliminar(0)}
            >
              No
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={pendiente}
              onClick={() => {
                if (pasoEliminar === 1) {
                  setPasoEliminar(2);
                  return;
                }
                empezar(async () => {
                  const r = await eliminarInspeccion(inspeccion.id);
                  if (r.ok) setPasoEliminar(0);
                  else setError(r.error);
                });
              }}
            >
              Sí
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
