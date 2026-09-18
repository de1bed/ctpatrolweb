import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

import type { EventoCalendario } from "./mes";

function tituloDia(fecha: Date): string {
  if (isToday(fecha)) return "Hoy";
  if (isTomorrow(fecha)) return "Mañana";
  if (isYesterday(fecha)) return "Ayer";
  return format(fecha, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Inspecciones de un día, debajo de la rejilla.
 *
 * La celda del mes cabe tres renglones; el detalle —hora, quién, enlace—
 * vive aquí para no convertir el calendario en una sopa de chips.
 */
export function ListaDia({
  fecha,
  eventos,
  vacio,
  accion,
}: {
  fecha: Date;
  eventos: EventoCalendario[];
  vacio: string;
  accion?: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold capitalize text-ink">
          {tituloDia(fecha)}
        </h2>
        {accion}
      </div>

      {eventos.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CalendarClock className="size-9 text-ink-muted/50" aria-hidden />
          <p className="text-sm text-ink-secondary">{vacio}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {eventos.map((e) => (
            <li key={e.id}>
              <Link href={e.href} className="block">
                <Card
                  interactive
                  className="flex items-center gap-3 p-4 hover:border-line-strong"
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold leading-tight",
                      e.color
                    )}
                  >
                    {e.hora}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">
                      {e.titulo}
                    </span>
                    {e.persona && (
                      <span className="block truncate text-sm text-ink-secondary">
                        {e.persona}
                      </span>
                    )}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
