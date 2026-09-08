"use client";

import { Camera, Check, Eye, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

import type { GuiaPunto } from "@/lib/inspection/guias";

/**
 * Guía de un punto de inspección.
 *
 * Sube desde abajo como hoja, no aparece como diálogo centrado: en el
 * teléfono una hoja se cierra deslizando y el pulgar la alcanza. Un modal a
 * media pantalla obliga a estirar la mano hasta la esquina.
 *
 * Lo primero que se ve es el diagrama con el punto resaltado. El inspector
 * abre esto porque no sabe DÓNDE mirar; el texto viene después.
 */
export function GuideSheet({
  nombre,
  guia,
  onCerrar,
}: {
  nombre: string;
  guia: GuiaPunto;
  onCerrar: () => void;
}) {
  // Bloquea el scroll del fondo mientras la hoja está abierta: si no, el
  // gesto de leer la guía mueve la lista de puntos que hay detrás.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      {/* Fondo: cierra al tocar fuera, que es lo que uno intenta primero. */}
      <button
        type="button"
        aria-label="Cerrar guía"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Guía de inspección: ${nombre}`}
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        {/* Asa: señal visual de que esto se arrastra y se cierra. */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-start gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Guía de inspección
            </p>
            <h2 className="mt-0.5 text-xl font-bold leading-tight text-ink">
              {nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pb-8">
          {/* ── Diagrama ─────────────────────────────────────────────────
              Fondo blanco fijo: los diagramas vienen sobre blanco y en modo
              oscuro flotarían sobre un fondo azul marino que los deforma. */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <Image
              src={guia.diagrama}
              alt={`Diagrama señalando ${nombre}`}
              width={1200}
              height={675}
              className="h-auto w-full"
              priority
            />
          </div>

          <p className="mt-4 text-ink-secondary">{guia.descripcion}</p>

          {/* ── Qué verificar ───────────────────────────────────────────── */}
          <section className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink">
              <Eye className="size-5 shrink-0 text-brand-600" aria-hidden />
              Qué verificar
            </h3>
            <ul className="flex flex-col gap-2">
              {guia.puntosClave.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-ink-secondary">
                  <Check
                    className="mt-1 size-4 shrink-0 text-ok-600"
                    strokeWidth={3}
                    aria-hidden
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Cómo fotografiarlo ──────────────────────────────────────── */}
          <section className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink">
              <Camera className="size-5 shrink-0 text-brand-600" aria-hidden />
              Cómo tomar la evidencia
            </h3>
            <ul className="flex flex-col gap-2">
              {guia.recomendaciones.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-ink-secondary">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600"
                    aria-hidden
                  />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
