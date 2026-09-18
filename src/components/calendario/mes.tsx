import Link from "next/link";

import { cn } from "@/lib/cn";
import {
  DIAS_SEMANA,
  claveDia,
  diasDelCalendario,
  esDelMes,
  etiquetaMes,
  mesAnterior,
  mesSiguiente,
} from "@/lib/calendario";

export type EventoCalendario = {
  id: string;
  dia: string;
  hora: string;
  titulo: string;
  persona: string | null;
  color: string;
  href: string;
};

/**
 * Rejilla mensual.
 *
 * El mes vive en la URL para que un enlace sea "el septiembre de Beto" y no
 * un estado de React que se pierde al recargar. Tocar un día lo selecciona;
 * el listado de ese día va aparte, debajo de la rejilla.
 */
export function CalendarioMes({
  mes,
  eventos,
  diaActivo,
  hrefMes,
  hrefDia,
}: {
  mes: Date;
  eventos: EventoCalendario[];
  diaActivo?: string;
  hrefMes: (clave: string) => string;
  hrefDia: (clave: string) => string;
}) {
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) {
    porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e]);
  }

  const hoy = claveDia(new Date());
  const celdas = diasDelCalendario(mes);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href={hrefMes(mesAnterior(mes))}
          className="flex size-11 items-center justify-center rounded-xl border border-line text-lg text-ink-secondary hover:border-line-strong"
          aria-label="Mes anterior"
        >
          ‹
        </Link>
        <h2 className="text-lg font-bold capitalize text-ink">{etiquetaMes(mes)}</h2>
        <Link
          href={hrefMes(mesSiguiente(mes))}
          className="flex size-11 items-center justify-center rounded-xl border border-line text-lg text-ink-secondary hover:border-line-strong"
          aria-label="Mes siguiente"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="bg-surface-sunken py-2 text-center text-[11px] font-bold uppercase tracking-wider text-ink-muted"
          >
            {d}
          </div>
        ))}

        {celdas.map((dia) => {
          const clave = claveDia(dia);
          const delMes = esDelMes(dia, mes);
          const items = porDia.get(clave) ?? [];
          const activo = diaActivo === clave;
          const esHoy = clave === hoy;

          return (
            <Link
              key={clave}
              href={hrefDia(clave)}
              className={cn(
                "flex min-h-20 flex-col gap-1 bg-surface p-1.5 sm:min-h-28 sm:p-2",
                !delMes && "bg-surface-sunken/60 text-ink-muted",
                activo && "ring-2 ring-inset ring-brand-600",
                esHoy && !activo && "bg-brand-50 dark:bg-brand-950/40"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  esHoy && "bg-brand-600 text-white"
                )}
              >
                {dia.getDate()}
              </span>
              <ul className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((e) => (
                  <li
                    key={e.id}
                    className={cn(
                      "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-xs",
                      e.color
                    )}
                    title={`${e.hora} ${e.titulo}${e.persona ? ` · ${e.persona}` : ""}`}
                  >
                    <span className="hidden sm:inline">{e.hora} </span>
                    {e.titulo}
                  </li>
                ))}
                {items.length > 3 && (
                  <li className="px-1 text-[10px] font-medium text-ink-muted">
                    +{items.length - 3}
                  </li>
                )}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
