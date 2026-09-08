"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

export type Opcion<T extends string> = {
  valor: T;
  etiqueta: string;
  descripcion?: string;
};

/**
 * Selección única con tarjetas grandes.
 *
 * Reemplaza al `<select>` nativo a propósito. Un desplegable en móvil abre
 * una rueda del sistema que tapa la pantalla, obliga a apuntar fino y esconde
 * las opciones hasta que lo abres. Con tarjetas, el inspector ve todo de un
 * vistazo y acierta con el pulgar sin mirar de cerca.
 *
 * Se usa un fieldset con radios reales: así funciona con teclado y con
 * lectores de pantalla sin tener que reimplementar ese comportamiento.
 */
export function OptionCards<T extends string>({
  nombre,
  leyenda,
  opciones,
  valor,
  onChange,
  columnas = 1,
  className,
}: {
  nombre: string;
  leyenda?: string;
  opciones: Opcion<T>[];
  valor: T | null;
  onChange: (valor: T) => void;
  columnas?: 1 | 2;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      {leyenda && (
        <legend className="mb-2.5 text-sm font-medium text-ink-secondary">
          {leyenda}
        </legend>
      )}

      <div
        className={cn(
          "grid gap-2.5",
          columnas === 2 ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {opciones.map((opcion) => {
          const activo = valor === opcion.valor;

          return (
            <label
              key={opcion.valor}
              className={cn(
                "relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4",
                "transition-[border-color,background-color,transform] duration-100",
                "active:scale-[0.99]",
                activo
                  ? "border-brand-600 bg-brand-50 dark:bg-brand-950/50"
                  : "border-line bg-surface-raised hover:border-line-strong"
              )}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.valor}
                checked={activo}
                onChange={() => onChange(opcion.valor)}
                className="sr-only"
              />

              {/* Marca visible: además del color, un check. Distinguir el
                  seleccionado solo por el tono azul deja fuera a quien no
                  percibe bien ese contraste. */}
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  activo
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line-strong"
                )}
              >
                {activo && <Check className="size-4" strokeWidth={3} aria-hidden />}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    "block font-semibold",
                    activo ? "text-brand-700 dark:text-brand-300" : "text-ink"
                  )}
                >
                  {opcion.etiqueta}
                </span>
                {opcion.descripcion && (
                  <span className="mt-0.5 block text-sm text-ink-secondary">
                    {opcion.descripcion}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Interruptor de sí/no.
 *
 * Se usa `role="switch"` en vez de un checkbox porque comunica mejor su
 * naturaleza a un lector de pantalla: es un estado que se enciende y apaga,
 * no una casilla de una lista.
 */
export function Toggle({
  etiqueta,
  descripcion,
  activo,
  onChange,
  className,
}: {
  etiqueta: string;
  descripcion?: string;
  activo: boolean;
  onChange: (activo: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left",
        "transition-colors active:scale-[0.99]",
        activo
          ? "border-brand-600 bg-brand-50 dark:bg-brand-950/50"
          : "border-line bg-surface-raised",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{etiqueta}</span>
        {descripcion && (
          <span className="mt-0.5 block text-sm text-ink-secondary">
            {descripcion}
          </span>
        )}
      </span>

      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          activo ? "bg-brand-600" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-[left]",
            activo ? "left-6" : "left-1"
          )}
        />
      </span>
    </button>
  );
}
