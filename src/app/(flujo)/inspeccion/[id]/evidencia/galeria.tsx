"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export type ItemEvidencia = {
  id: string;
  tipo: "foto" | "video";
  paso: string;
  pasoTitulo: string;
  punto: string;
  url: string | null;
  capturadaEn: string;
  latitud: number | null;
  longitud: number | null;
  tieneAnalisis: boolean;
};

/**
 * Galería de evidencia con visor a pantalla completa.
 *
 * Rejilla densa para poder barrer 41 fotos rápido, y visor grande para
 * inspeccionar una. El visor se recorre con flechas o deslizando: revisar
 * evidencia es una tarea secuencial, y volver a la rejilla entre cada foto
 * multiplicaría los toques por cuarenta.
 */
export function Galeria({
  items,
  inspeccionId,
  permitirRehacer,
}: {
  items: ItemEvidencia[];
  inspeccionId: string;
  permitirRehacer: boolean;
}) {
  const [abierta, setAbierta] = useState<number | null>(null);

  const mover = useCallback(
    (delta: number) => {
      setAbierta((actual) => {
        if (actual === null) return null;
        const siguiente = actual + delta;
        // Se detiene en los extremos en vez de dar la vuelta: al revisar en
        // orden, volver al principio sin avisar desorienta.
        if (siguiente < 0 || siguiente >= items.length) return actual;
        return siguiente;
      });
    },
    [items.length]
  );

  useEffect(() => {
    if (abierta === null) return;

    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    }

    document.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [abierta, mover]);

  // Agrupadas por fase, conservando el orden en que llegaron (que es el del
  // flujo, porque la consulta ordena por fase y posición).
  const grupos: { titulo: string; items: { item: ItemEvidencia; indice: number }[] }[] = [];
  items.forEach((item, indice) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === item.pasoTitulo) {
      ultimo.items.push({ item, indice });
    } else {
      grupos.push({ titulo: item.pasoTitulo, items: [{ item, indice }] });
    }
  });

  const activa = abierta !== null ? items[abierta] : null;

  return (
    <>
      <p className="mb-4 text-sm text-ink-secondary">
        {items.length} {items.length === 1 ? "archivo" : "archivos"} · toca uno
        para verlo en grande
      </p>

      <div className="flex flex-col gap-7">
        {grupos.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
              {grupo.titulo}
              <span className="ml-2 font-normal normal-case tracking-normal">
                {grupo.items.length}
              </span>
            </h2>

            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {grupo.items.map(({ item, indice }) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setAbierta(indice)}
                    aria-label={`Ver ${item.punto}`}
                    className="relative block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface-sunken transition-transform active:scale-95"
                  >
                    {item.tipo === "video" ? (
                      <video
                        src={item.url ?? undefined}
                        preload="metadata"
                        className="size-full object-cover"
                        muted
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.url ?? ""}
                        alt={item.punto}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}

                    {item.tipo === "video" && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        VIDEO
                      </span>
                    )}

                    {item.tieneAnalisis && (
                      <span
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white"
                        title="Analizada con IA"
                      >
                        <Sparkles className="size-3" aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* ── Visor ──────────────────────────────────────────────────────── */}
      {activa && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-start gap-3 px-gutter pt-safe">
            <div className="flex min-h-14 flex-1 flex-col justify-center">
              <p className="truncate font-semibold text-white">{activa.punto}</p>
              <p className="truncate text-xs text-white/70">
                {activa.pasoTitulo} · {abierta! + 1} de {items.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAbierta(null)}
              aria-label="Cerrar"
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-white/90 active:bg-white/10"
            >
              <X className="size-7" aria-hidden />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {activa.tipo === "video" ? (
              <video
                src={activa.url ?? undefined}
                controls
                playsInline
                className="max-h-full max-w-full"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activa.url ?? ""}
                alt={activa.punto}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {/* Zonas de navegación anchas a los lados: el pulgar acierta sin
                tener que apuntar a una flecha chica. */}
            {abierta! > 0 && (
              <button
                type="button"
                onClick={() => mover(-1)}
                aria-label="Anterior"
                className="absolute left-0 top-0 flex h-full w-16 items-center justify-center text-white/70 active:bg-white/10"
              >
                <ChevronLeft className="size-8" aria-hidden />
              </button>
            )}
            {abierta! < items.length - 1 && (
              <button
                type="button"
                onClick={() => mover(1)}
                aria-label="Siguiente"
                className="absolute right-0 top-0 flex h-full w-16 items-center justify-center text-white/70 active:bg-white/10"
              >
                <ChevronRight className="size-8" aria-hidden />
              </button>
            )}
          </div>

          <div className="px-gutter pb-safe pt-3">
            <div className="pb-4">
              <p className="font-mono text-xs text-white/80">
                {format(new Date(activa.capturadaEn), "dd/MM/yyyy HH:mm:ss")}
              </p>
              {activa.latitud != null && activa.longitud != null && (
                <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-white/60">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  {activa.latitud.toFixed(6)}, {activa.longitud.toFixed(6)}
                </p>
              )}

              {permitirRehacer && (
                <Link
                  href={`/inspeccion/${inspeccionId}/${activa.paso}`}
                  className={cn(
                    "mt-3 flex min-h-11 w-full items-center justify-center rounded-xl",
                    "border border-white/30 text-sm font-medium text-white active:bg-white/10"
                  )}
                >
                  Ir a la fase para volver a capturar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
