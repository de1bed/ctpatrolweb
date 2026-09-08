import { cn } from "@/lib/cn";

/**
 * Barra de avance de la inspección.
 *
 * Lleva el número además de la barra: "12 de 19" le dice al inspector
 * cuánto le falta en unidades que puede contar. Un 63% no le dice si son
 * dos pantallas más o diez.
 */
export function ProgressBar({
  completados,
  total,
  className,
}: {
  completados: number;
  total: number;
  className?: string;
}) {
  const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);
  const terminado = completados === total && total > 0;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink-secondary">
          {completados} de {total} pasos
        </span>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            terminado ? "text-ok-600" : "text-ink"
          )}
        >
          {porcentaje}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={completados}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Avance de la inspección"
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            terminado ? "bg-ok-600" : "bg-brand-600"
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
