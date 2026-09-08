"use client";

import { AlertTriangle, Check, ChevronRight, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fotosDeInspeccion } from "@/lib/media/almacen";

import type { PropsFase } from "./tipos";

export type ResumenPaso = {
  clave: string;
  titulo: string;
  completado: boolean;
  /** Hallazgos "regular" o "malo" detectados en esta fase. */
  hallazgos: number;
};

/**
 * Fase · Revisión.
 *
 * Último vistazo antes de firmar. Resume qué quedó capturado, cuántas fotos
 * hay y dónde hubo hallazgos, con enlace directo a cada fase para corregir.
 *
 * Los hallazgos se destacan porque son la razón de ser del reporte: una
 * inspección donde todo salió bien casi no se lee, una con hallazgos se lee
 * con lupa.
 */
export function FaseRevision(
  props: PropsFase & { resumen: ResumenPaso[] }
) {
  const [fotos, setFotos] = useState<number | null>(null);

  useEffect(() => {
    fotosDeInspeccion(props.inspeccionId).then((f) => setFotos(f.length));
  }, [props.inspeccionId]);

  const pendientes = props.resumen.filter((r) => !r.completado);
  const totalHallazgos = props.resumen.reduce((n, r) => n + r.hallazgos, 0);

  return (
    <PantallaFase
      {...props}
      descripcion="Repaso de todo lo capturado. Toca cualquier fase para corregirla."
      etiquetaBoton="Todo correcto, continuar"
      recolectar={() => ({})}
    >
      {/* ── Cifras ─────────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <ImageIcon className="size-4" aria-hidden />
            Evidencia
          </p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {fotos === null ? "…" : fotos}
          </p>
          <p className="text-sm text-ink-secondary">
            {fotos === 1 ? "foto" : "fotos"}
          </p>
        </Card>

        <Card
          className={cn(
            "p-4",
            totalHallazgos > 0 && "border-warn-500/40 bg-warn-50 dark:bg-warn-500/10"
          )}
        >
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <AlertTriangle className="size-4" aria-hidden />
            Hallazgos
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              totalHallazgos > 0 ? "text-warn-700 dark:text-warn-500" : "text-ink"
            )}
          >
            {totalHallazgos}
          </p>
          <p className="text-sm text-ink-secondary">
            {totalHallazgos === 0 ? "sin novedad" : "puntos con observación"}
          </p>
        </Card>
      </div>

      {pendientes.length > 0 && (
        <Card className="mb-5 flex items-start gap-3 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn-600" aria-hidden />
          <p className="text-sm text-ink-secondary">
            Todavía hay {pendientes.length}{" "}
            {pendientes.length === 1 ? "fase pendiente" : "fases pendientes"}.
            Puedes continuar, pero el reporte saldrá incompleto.
          </p>
        </Card>
      )}

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
        {props.resumen.map((paso, i) => (
          <li key={paso.clave}>
            <Link
              href={`/inspeccion/${props.inspeccionId}/${paso.clave}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-sunken",
                i > 0 && "border-t border-line"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  paso.completado
                    ? "border-ok-600 bg-ok-600 text-white"
                    : "border-line-strong"
                )}
              >
                {paso.completado && (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {paso.titulo}
                </span>
                {paso.hallazgos > 0 && (
                  <span className="block text-sm text-warn-700 dark:text-warn-500">
                    {paso.hallazgos}{" "}
                    {paso.hallazgos === 1 ? "hallazgo" : "hallazgos"}
                  </span>
                )}
              </span>

              <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PantallaFase>
  );
}
