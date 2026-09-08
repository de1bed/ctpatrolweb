import {
  Ban,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { Database } from "@/lib/supabase/database.types";

type Estado = Database["public"]["Enums"]["inspection_status"];

/**
 * Etiqueta de estado.
 *
 * Cada estado lleva ícono Y texto, nunca solo color. Alrededor del 8% de los
 * hombres tiene algún tipo de daltonismo, y este es un gremio mayormente
 * masculino: distinguir "pausada" de "completada" solo por ámbar contra
 * verde deja gente fuera.
 */
const MAPA: Record<
  Estado,
  { etiqueta: string; icono: LucideIcon; clases: string }
> = {
  draft: {
    etiqueta: "Borrador",
    icono: CircleDashed,
    clases: "bg-surface-sunken text-ink-secondary border-line",
  },
  assigned: {
    etiqueta: "Asignada",
    icono: ClipboardList,
    clases:
      "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800",
  },
  in_progress: {
    etiqueta: "En curso",
    icono: PlayCircle,
    clases:
      "bg-brand-600 text-white border-brand-600",
  },
  paused: {
    etiqueta: "Pausada",
    icono: PauseCircle,
    clases:
      "bg-warn-50 text-warn-700 border-warn-500/40 dark:bg-warn-500/10 dark:text-warn-500",
  },
  completed: {
    etiqueta: "Completada",
    icono: CheckCircle2,
    clases:
      "bg-ok-50 text-ok-700 border-ok-500/40 dark:bg-ok-500/10 dark:text-ok-500",
  },
  cancelled: {
    etiqueta: "Cancelada",
    icono: Ban,
    clases:
      "bg-danger-50 text-danger-700 border-danger-500/40 dark:bg-danger-500/10 dark:text-danger-500",
  },
};

export function StatusBadge({
  estado,
  className,
}: {
  estado: Estado;
  className?: string;
}) {
  const { etiqueta, icono: Icono, clases } = MAPA[estado];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-semibold leading-none",
        clases,
        className
      )}
    >
      <Icono className="size-3.5 shrink-0" aria-hidden />
      {etiqueta}
    </span>
  );
}
