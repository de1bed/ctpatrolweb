"use client";

import { AlertCircle, PauseCircle, PlayCircle } from "lucide-react";
import { useState, useTransition } from "react";

import {
  pausarInspeccion,
  reanudarInspeccion,
} from "@/app/(flujo)/inspeccion/[id]/acciones";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Pausar y reanudar una inspección.
 *
 * La pausa es un momento real de la operación: la unidad sale a cargar y
 * vuelve horas después. Sin este botón, el inspector tenía que dejar la
 * pestaña abierta o perder el hilo de dónde iba.
 *
 * Solo aparece cuando el motor dice que se puede pausar, es decir con las
 * secciones críticas terminadas. Antes de eso, al retomar no habría forma de
 * saber qué pantallas le tocan.
 */
export function ControlesPausa({
  inspeccionId,
  estado,
  puedePausar,
  criticosPendientes,
}: {
  inspeccionId: string;
  estado: string;
  puedePausar: boolean;
  criticosPendientes: number;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (estado === "paused") {
    return (
      <Card className="mt-4 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
        <div className="flex items-start gap-3">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-warn-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Inspección pausada</p>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Lo capturado está guardado. Retómala cuando la unidad regrese.
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-danger-600">
            {error}
          </p>
        )}

        <Button
          block
          className="mt-3"
          loading={pendiente}
          onClick={() =>
            empezar(async () => {
              setError(null);
              const r = await reanudarInspeccion(inspeccionId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          <PlayCircle className="size-5" aria-hidden />
          Reanudar inspección
        </Button>
      </Card>
    );
  }

  if (estado !== "in_progress") return null;

  return (
    <div className="mt-4">
      {error && (
        <p
          role="alert"
          className="mb-2 flex items-start gap-2 text-sm text-danger-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button
        variant="secondary"
        block
        disabled={!puedePausar || pendiente}
        loading={pendiente}
        onClick={() =>
          empezar(async () => {
            setError(null);
            const r = await pausarInspeccion(inspeccionId);
            if (!r.ok) setError(r.error);
          })
        }
      >
        <PauseCircle className="size-5" aria-hidden />
        Pausar inspección
      </Button>

      {/* Se explica por qué está deshabilitado. Un botón gris sin motivo
          hace que el inspector lo toque tres veces y luego llame a soporte. */}
      {!puedePausar && (
        <p className="mt-2 text-center text-sm text-ink-muted">
          Podrás pausar cuando termines las {criticosPendientes} secciones
          obligatorias que faltan.
        </p>
      )}
    </div>
  );
}
