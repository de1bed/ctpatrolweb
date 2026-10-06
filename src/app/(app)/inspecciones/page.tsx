import { format } from "date-fns";
import { CalendarClock, ClipboardList } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { CalendarioMes, type EventoCalendario } from "@/components/calendario/mes";
import { ListaDia } from "@/components/calendario/lista-dia";
import { InspectionCard } from "@/components/inspection/inspection-card";
import { RefrescoEnVivo } from "@/components/inspection/refresco-en-vivo";
import { equiposParaTarjetas } from "@/lib/inspecciones/colectiva";
import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import {
  claveDia,
  claveMes,
  colorPorId,
  mesDesdeParam,
  hoyEn,
  rangoConsulta,
} from "@/lib/calendario";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { aZona } from "@/lib/zona";
import { zonaDelUsuario } from "@/lib/zona-servidor";

export const metadata: Metadata = { title: "Inspecciones" };

type Vista = "abiertas" | "agenda";

/**
 * Inspecciones del inspector, en dos vistas.
 *
 *   abiertas  Lo que requiere trabajo ahora: asignadas, en curso, pausadas.
 *   agenda    Calendario del mes: lo que el admin le programó.
 *
 * Van juntas y no en pestañas separadas de la barra inferior porque son la
 * misma pregunta —"¿qué me toca?"— vista en dos horizontes.
 */
export default async function InspeccionesPage({
  searchParams,
}: PageProps<"/inspecciones">) {
  const sesion = await requerirSesion();
  const params = await searchParams;
  const extra = params as typeof params & { mes?: string; dia?: string };
  const vista: Vista = extra.vista === "agenda" ? "agenda" : "abiertas";
  const tz = await zonaDelUsuario();
  const mes = mesDesdeParam(
    typeof extra.mes === "string" ? extra.mes : undefined,
    tz
  );
  const diaParam = typeof extra.dia === "string" ? extra.dia : "";
  const diaActivo = /^\d{4}-\d{2}-\d{2}$/.test(diaParam)
    ? diaParam
    : claveMes(mes) === claveMes(hoyEn(tz))
      ? claveDia(hoyEn(tz))
      : `${claveMes(mes)}-01`;

  const supabase = await createClient();
  const { desde, hasta } = rangoConsulta(mes, tz);

  const { data } =
    vista === "agenda"
      ? await supabase
          .from("inspections")
          .select(
            "id, display_id, status, customer_name, tractor_number, updated_at, scheduled_for, is_collective, assigned_to"
          )
          .eq("company_account_id", sesion.companyAccountId)
          .not("scheduled_for", "is", null)
          .gte("scheduled_for", desde.toISOString())
          .lt("scheduled_for", hasta.toISOString())
          .in("status", ["draft", "assigned", "in_progress", "paused"])
          .order("scheduled_for", { ascending: true })
          .limit(200)
      : await supabase
          .from("inspections")
          .select(
            "id, display_id, status, customer_name, tractor_number, updated_at, scheduled_for, is_collective, assigned_to"
          )
          .eq("company_account_id", sesion.companyAccountId)
          .in("status", ["draft", "assigned", "in_progress", "paused"])
          .order("updated_at", { ascending: false })
          .limit(100);

  const inspecciones = data ?? [];
  // Colectivas: encargado, quién se unió y si alguien captura ahora.
  const equipos =
    vista === "abiertas"
      ? await equiposParaTarjetas(supabase, inspecciones, sesion.companyAccountId)
      : {};
  const hayEnVivo = Object.values(equipos).some((e) => e.enVivo);

  const eventos: EventoCalendario[] = inspecciones
    .filter((i) => i.scheduled_for)
    .map((i) => {
      // Día y hora en la zona de quien mira: el servidor corre en UTC.
      const cuando = aZona(i.scheduled_for as string, tz);
      return {
        id: i.id,
        dia: claveDia(cuando),
        hora: format(cuando, "HH:mm"),
        titulo: i.customer_name ?? i.display_id,
        persona: i.tractor_number,
        color: colorPorId(sesion.userId),
        href: `/inspeccion/${i.id}`,
      };
    });

  const delDia = eventos.filter((e) => e.dia === diaActivo);
  const fechaDia = new Date(`${diaActivo}T12:00:00`);

  function hrefMes(clave: string) {
    return `/inspecciones?vista=agenda&mes=${clave}`;
  }
  function hrefDia(clave: string) {
    return `/inspecciones?vista=agenda&mes=${claveMes(mes)}&dia=${clave}`;
  }

  return (
    <>
      <AppHeader
        titulo="Inspecciones"
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
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
                    href={
                      v.valor === "agenda"
                        ? `/inspecciones?vista=agenda&mes=${claveMes(mes)}`
                        : "/inspecciones?vista=abiertas"
                    }
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

        {vista === "agenda" ? (
          <>
            <CalendarioMes
              mes={mes}
              eventos={eventos}
              diaActivo={diaActivo}
              hrefMes={hrefMes}
              hrefDia={hrefDia}
              hoy={claveDia(hoyEn(tz))}
            />
            <ListaDia
              fecha={fechaDia}
              eventos={delDia}
              vacio="Nada programado este día. Cuando tu administrador te asigne una inspección con fecha, aparece aquí."
            />
          </>
        ) : inspecciones.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ClipboardList className="size-10 text-ink-muted/50" aria-hidden />
            <p className="font-medium text-ink">Sin inspecciones abiertas</p>
            <p className="max-w-xs text-sm text-ink-secondary">
              Aquí aparecen las asignadas, las que dejaste a medias y las
              pausadas.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            <RefrescoEnVivo activo={hayEnVivo} />
            {inspecciones.map((i) => (
              <li key={i.id}>
                <InspectionCard inspeccion={i} equipo={equipos[i.id]} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
