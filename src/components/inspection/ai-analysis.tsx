"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useState, useTransition } from "react";

import { analizarEvidencia } from "@/app/(flujo)/inspeccion/[id]/ia-acciones";
import { cn } from "@/lib/cn";
import type { Analisis } from "@/lib/ai/vision";

/**
 * Análisis de una foto con IA.
 *
 * Es una SEGUNDA OPINIÓN, no un dictamen. La interfaz lo dice explícitamente
 * y no toca la calificación del punto: si el botón cambiara la calificación
 * solo, el inspector acabaría firmando el criterio de un modelo que no estuvo
 * ahí ni puede tocar la unidad.
 *
 * Se dispara a mano y no automáticamente: cada análisis cuesta dinero, y en
 * la mayoría de los puntos el inspector ya sabe lo que ve. Se usa donde hay
 * duda, que es donde aporta.
 */
export function AnalisisIA({
  inspeccionId,
  mediaId,
  analisisPrevio,
}: {
  inspeccionId: string;
  /** Id de la fila de evidencia. Null mientras la foto no se haya subido. */
  mediaId: string | null;
  analisisPrevio?: Analisis | null;
}) {
  const [pendiente, empezar] = useTransition();
  const [analisis, setAnalisis] = useState<Analisis | null>(
    analisisPrevio ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Sin foto subida no hay nada que analizar: el servidor necesita leerla de
  // Storage, y todavía vive solo en el dispositivo.
  if (!mediaId) {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        El análisis con IA estará disponible cuando la foto termine de subir.
      </p>
    );
  }

  if (analisis) {
    const tono =
      analisis.sugerencia === "atencion"
        ? "danger"
        : analisis.sugerencia === "revisar"
          ? "warn"
          : "ok";

    const Icono =
      tono === "ok" ? CheckCircle2 : tono === "warn" ? Eye : AlertTriangle;

    return (
      <div
        className={cn(
          "mt-2.5 rounded-xl border p-3 text-sm",
          tono === "ok" &&
            "border-ok-500/40 bg-ok-50 dark:bg-ok-500/10",
          tono === "warn" &&
            "border-warn-500/40 bg-warn-50 dark:bg-warn-500/10",
          tono === "danger" &&
            "border-danger-500/40 bg-danger-50 dark:bg-danger-500/10"
        )}
      >
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <Icono
            className={cn(
              "size-4 shrink-0",
              tono === "ok" && "text-ok-600",
              tono === "warn" && "text-warn-600",
              tono === "danger" && "text-danger-600"
            )}
            aria-hidden
          />
          {analisis.sugerencia === "sin_novedad"
            ? "Sin novedad aparente"
            : analisis.sugerencia === "revisar"
              ? "Conviene revisar"
              : "Requiere atención"}
        </p>

        <p className="mt-1.5 text-ink-secondary">{analisis.observacion}</p>

        {analisis.indicios.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {analisis.indicios.map((i) => (
              <li key={i} className="flex items-start gap-1.5 text-ink-secondary">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-current"
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
        )}

        {analisis.calidadImagen !== "buena" && analisis.problemaCalidad && (
          <p className="mt-2 border-t border-current/15 pt-2 text-ink-muted">
            Calidad de la foto: {analisis.calidadImagen}.{" "}
            {analisis.problemaCalidad}
          </p>
        )}

        <p className="mt-2 border-t border-current/15 pt-2 text-xs text-ink-muted">
          Sugerencia automática. La calificación del punto la decides tú.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {error && (
        <p role="alert" className="mb-1.5 text-xs text-danger-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          empezar(async () => {
            setError(null);
            const r = await analizarEvidencia({ inspeccionId, mediaId });
            if (r.ok) setAnalisis(r.analisis);
            else setError(r.error);
          })
        }
        className="flex items-center gap-1.5 text-sm font-medium text-brand-600 disabled:opacity-50"
      >
        {pendiente ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {pendiente ? "Analizando…" : "Analizar con IA"}
      </button>
    </div>
  );
}
