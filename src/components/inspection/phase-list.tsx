import { Check, ChevronRight, Lock, MinusCircle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { NOMBRES_GRUPO, type GrupoFase } from "@/lib/inspection/fases";
import { agruparPasos, puedeAbrir, type Flujo } from "@/lib/inspection/flujo";

/**
 * Índice de fases de la inspección.
 *
 * Todo lo que se ve aquí sale del motor: qué fases aparecen, cuáles se
 * pueden abrir y cuáles se omitieron. Este componente no sabe nada de tipos
 * de transporte ni de reglas C-TPAT — solo pinta lo que el motor calculó.
 *
 * Las fases omitidas SÍ se muestran, con su razón. Que desaparezcan sin más
 * hace dudar al inspector de si la app se equivocó o si él capturó algo mal;
 * verlas tachadas con el motivo cierra esa duda.
 */
export function PhaseList({
  flujo,
  inspeccionId,
}: {
  flujo: Flujo;
  inspeccionId: string;
}) {
  const grupos = agruparPasos(flujo);

  return (
    <div className="flex flex-col gap-7">
      {[...grupos.entries()].map(([grupo, pasos]) => (
        <section key={grupo}>
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
            {NOMBRES_GRUPO[grupo as GrupoFase]}
          </h2>

          <ul className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
            {pasos.map((paso, i) => {
              const abrible = puedeAbrir(flujo, paso.clave);
              const esSiguiente = flujo.siguiente?.clave === paso.clave;

              const contenido = (
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5",
                    i > 0 && "border-t border-line",
                    esSiguiente && "bg-brand-50 dark:bg-brand-950/40"
                  )}
                >
                  {/* Indicador de estado: forma distinta, no solo color. */}
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                      paso.completado
                        ? "border-ok-600 bg-ok-600 text-white"
                        : abrible
                          ? "border-brand-600 text-brand-600"
                          : "border-line-strong text-ink-muted"
                    )}
                  >
                    {paso.completado ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    ) : abrible ? (
                      <span className="text-xs font-bold">{i + 1}</span>
                    ) : (
                      <Lock className="size-3.5" aria-hidden />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-semibold",
                        abrible ? "text-ink" : "text-ink-muted"
                      )}
                    >
                      {paso.titulo}
                    </p>
                    <p className="truncate text-sm text-ink-secondary">
                      {paso.fase.descripcion}
                    </p>
                  </div>

                  {esSiguiente && (
                    <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
                      Sigue
                    </span>
                  )}

                  {abrible && (
                    <ChevronRight
                      className="size-5 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                  )}
                </div>
              );

              return (
                <li key={paso.clave}>
                  {abrible ? (
                    <Link
                      href={`/inspeccion/${inspeccionId}/${paso.clave}`}
                      className="block transition-colors active:bg-surface-sunken"
                    >
                      {contenido}
                    </Link>
                  ) : (
                    // Sin permiso de abrir no es un enlace: un enlace que no
                    // lleva a ningún lado se siente roto. Aquí se ve bloqueado
                    // a propósito.
                    <div aria-disabled className="cursor-not-allowed">
                      {contenido}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* ── Omitidas ─────────────────────────────────────────────────────── */}
      {flujo.omitidas.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
            No aplican a esta unidad
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-dashed border-line bg-surface-sunken/50">
            {flujo.omitidas.map((o, i) => (
              <li
                key={o.fase.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  i > 0 && "border-t border-line"
                )}
              >
                <MinusCircle
                  className="mt-0.5 size-5 shrink-0 text-ink-muted"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium text-ink-secondary line-through decoration-ink-muted/50">
                    {o.fase.nombre}
                  </p>
                  <p className="text-sm text-ink-muted">{o.razon}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
