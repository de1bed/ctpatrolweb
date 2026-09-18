"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { analizarEvidencia } from "@/app/(flujo)/inspeccion/[id]/ia-acciones";
import { cn } from "@/lib/cn";
import type { Analisis } from "@/lib/ai/vision";
import {
  EVENTO_EVIDENCIA_SUBIDA,
  type DetalleEvidenciaSubida,
} from "@/lib/media/almacen";

/**
 * Evita dos llamadas a OpenAI por la misma foto (Strict Mode, re-renders).
 * Si el análisis falla se saca del set para poder reintentar.
 */
const lanzados = new Set<string>();

/**
 * Análisis de una foto con IA.
 *
 * Es una SEGUNDA OPINIÓN, no un dictamen. La interfaz lo dice explícitamente
 * y no toca la calificación del punto: si el botón cambiara la calificación
 * solo, el inspector acabaría firmando el criterio de un modelo que no estuvo
 * ahí ni puede tocar la unidad.
 *
 * Se dispara solo cuando la foto ya está en Storage. El servidor es
 * idempotente: recargar o volver al punto no vuelve a gastar tokens.
 */
export function AnalisisIA({
  inspeccionId,
  puntoClave,
  mediaId,
  analisisPrevio,
}: {
  inspeccionId: string;
  puntoClave: string;
  /** Id de la fila de evidencia. Null mientras la foto no se haya subido. */
  mediaId: string | null;
  analisisPrevio?: Analisis | null;
}) {
  const [pendiente, empezar] = useTransition();
  const [id, setId] = useState<string | null>(mediaId);
  const [analisis, setAnalisis] = useState<Analisis | null>(
    analisisPrevio ?? null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mediaId) setId(mediaId);
  }, [mediaId]);

  useEffect(() => {
    function alSubir(e: Event) {
      const detalle = (e as CustomEvent<DetalleEvidenciaSubida>).detail;
      if (
        detalle.inspeccionId !== inspeccionId ||
        detalle.puntoClave !== puntoClave
      ) {
        return;
      }
      setId(detalle.mediaId);
    }

    window.addEventListener(EVENTO_EVIDENCIA_SUBIDA, alSubir);
    return () => window.removeEventListener(EVENTO_EVIDENCIA_SUBIDA, alSubir);
  }, [inspeccionId, puntoClave]);

  useEffect(() => {
    if (!id || analisis) return;
    if (lanzados.has(id)) return;
    lanzados.add(id);

    empezar(async () => {
      setError(null);
      const r = await analizarEvidencia({ inspeccionId, mediaId: id });
      if (r.ok) {
        setAnalisis(r.analisis);
      } else {
        lanzados.delete(id);
        setError(r.error);
      }
    });
  }, [id, analisis, inspeccionId, empezar]);

  function reintentar() {
    if (!id) return;
    lanzados.delete(id);
    lanzados.add(id);
    empezar(async () => {
      setError(null);
      const r = await analizarEvidencia({ inspeccionId, mediaId: id });
      if (r.ok) setAnalisis(r.analisis);
      else {
        lanzados.delete(id);
        setError(r.error);
      }
    });
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
          tono === "ok" && "border-ok-500/40 bg-ok-50 dark:bg-ok-500/10",
          tono === "warn" && "border-warn-500/40 bg-warn-50 dark:bg-warn-500/10",
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

  if (!id) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
        Subiendo… la IA analizará la foto al terminar.
      </p>
    );
  }

  return (
    <div className="mt-2">
      {error && (
        <p role="alert" className="mb-1.5 text-xs text-danger-600">
          {error}
        </p>
      )}

      {error && !pendiente ? (
        <button
          type="button"
          onClick={reintentar}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600"
        >
          <Sparkles className="size-4" aria-hidden />
          Reintentar análisis
        </button>
      ) : (
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
          Analizando foto…
        </p>
      )}
    </div>
  );
}
