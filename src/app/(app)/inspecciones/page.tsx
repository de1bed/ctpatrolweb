import {
  differenceInCalendarDays,
  format,
  isPast,
  isToday,
  isTomorrow,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, ClipboardList } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { InspectionCard } from "@/components/inspection/inspection-card";
import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inspecciones" };

type Vista = "abiertas" | "agenda";

/**
 * Inspecciones del inspector, en dos vistas.
 *
 *   abiertas  Lo que requiere trabajo ahora: asignadas, en curso, pausadas.
 *   agenda    Lo programado a futuro, agrupado por día.
 *
 * Van juntas y no en pestañas separadas de la barra inferior porque son la
 * misma pregunta —"¿qué me toca?"— vista en dos horizontes. Y porque una
 * quinta pestaña abajo dejaría de leerse de un vistazo.
 */
export default async function InspeccionesPage({
  searchParams,
}: PageProps<"/inspecciones">) {
  const sesion = await requerirSesion();
  const params = await searchParams;
  const vista: Vista = params.vista === "agenda" ? "agenda" : "abiertas";

  const supabase = await createClient();

  const consulta = supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, updated_at, scheduled_for"
    )
    .limit(100);

  const { data } =
    vista === "agenda"
      ? await consulta
          .not("scheduled_for", "is", null)
          .in("status", ["draft", "assigned"])
          .order("scheduled_for", { ascending: true })
      : await consulta
          .in("status", ["draft", "assigned", "in_progress", "paused"])
          .order("updated_at", { ascending: false });

  const inspecciones = data ?? [];

  return (
    <>
      <AppHeader
        titulo="Inspecciones"
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
        {/* Vistas como enlaces: quedan en la URL y se pueden compartir. */}
        <nav aria-label="Vista" className="mb-5">
          <ul className="flex gap-2">
            {(
              [
                { valor: "abiertas" as Vista, etiqueta: "Abiertas", icono: ClipboardList },
                { valor: "agenda" as Vista, etiqueta: "Programadas", icono: CalendarClock },
              ]
            ).map((v) => {
              const activo = vista === v.valor;
              const Icono = v.icono;
              return (
                <li key={v.valor} className="flex-1">
                  <Link
                    href={`/inspecciones?vista=${v.valor}`}
                    aria-current={activo ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                      activo
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-line bg-surface text-ink-secondary"
                    )}
                  >
                    <Icono className="size-4 shrink-0" aria-hidden />
                    {v.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {inspecciones.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            {vista === "agenda" ? (
              <CalendarClock className="size-10 text-ink-muted/50" aria-hidden />
            ) : (
              <ClipboardList className="size-10 text-ink-muted/50" aria-hidden />
            )}
            <p className="font-medium text-ink">
              {vista === "agenda"
                ? "Nada programado"
                : "Sin inspecciones abiertas"}
            </p>
            <p className="max-w-xs text-sm text-ink-secondary">
              {vista === "agenda"
                ? "Cuando tu administrador programe inspecciones con fecha, aparecen aquí ordenadas por día."
                : "Aquí aparecen las asignadas, las que dejaste a medias y las pausadas."}
            </p>
          </Card>
        ) : vista === "agenda" ? (
          <Agenda inspecciones={inspecciones} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {inspecciones.map((i) => (
              <li key={i.id}>
                <InspectionCard inspeccion={i} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

type Programada = {
  id: string;
  display_id: string;
  status: "draft" | "assigned" | "in_progress" | "paused" | "completed" | "cancelled";
  customer_name: string | null;
  tractor_number: string | null;
  updated_at: string;
  scheduled_for: string | null;
};

/**
 * Agenda agrupada por día.
 *
 * Los encabezados dicen "Hoy" y "Mañana" en vez de la fecha: es como piensa
 * quien va a trabajar ese turno. La fecha completa se queda para los días
 * más lejanos, donde el nombre relativo dejaría de orientar.
 */
function Agenda({ inspecciones }: { inspecciones: Programada[] }) {
  const grupos = new Map<string, Programada[]>();

  for (const i of inspecciones) {
    if (!i.scheduled_for) continue;
    const dia = format(new Date(i.scheduled_for), "yyyy-MM-dd");
    grupos.set(dia, [...(grupos.get(dia) ?? []), i]);
  }

  return (
    <div className="flex flex-col gap-7">
      {[...grupos.entries()].map(([dia, items]) => {
        const fecha = new Date(`${dia}T12:00:00`);
        const vencido = isPast(fecha) && !isToday(fecha);
        const dias = differenceInCalendarDays(fecha, new Date());

        const titulo = isToday(fecha)
          ? "Hoy"
          : isTomorrow(fecha)
            ? "Mañana"
            : format(fecha, "EEEE d 'de' MMMM", { locale: es });

        return (
          <section key={dia}>
            <h2 className="mb-2.5 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  vencido ? "text-danger-600" : "text-ink-muted"
                )}
              >
                {titulo}
              </span>
              {vencido && (
                <span className="text-xs font-medium text-danger-600">
                  · vencida hace {Math.abs(dias)}{" "}
                  {Math.abs(dias) === 1 ? "día" : "días"}
                </span>
              )}
            </h2>

            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((i) => (
                <li key={i.id}>
                  <InspectionCard inspeccion={i} />
                  {i.scheduled_for && (
                    <p className="mt-1 px-1 text-xs text-ink-muted">
                      Programada a las{" "}
                      {format(new Date(i.scheduled_for), "HH:mm")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
