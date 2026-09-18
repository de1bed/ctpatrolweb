import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { CalendarioMes, type EventoCalendario } from "@/components/calendario/mes";
import { ListaDia } from "@/components/calendario/lista-dia";
import { Card } from "@/components/ui/card";
import { requerirAdmin } from "@/lib/auth";
import {
  aDatetimeLocal,
  claveDia,
  claveMes,
  colorPorId,
  inicioTurno,
  mesDesdeParam,
  rangoVisible,
} from "@/lib/calendario";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";

import { BotonProgramar } from "./boton-programar";

export const metadata: Metadata = { title: "Calendario · Admin" };

function valorParam(
  params: Record<string, string | string[] | undefined>,
  clave: string
): string {
  const v = params[clave];
  return typeof v === "string" ? v : "";
}

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requerirAdmin();
  const params = await searchParams;

  const mes = mesDesdeParam(valorParam(params, "mes") || undefined);
  const inspectorFiltro = valorParam(params, "inspector");
  const diaParam = valorParam(params, "dia");
  const hoy = claveDia(new Date());
  const diaActivo = /^\d{4}-\d{2}-\d{2}$/.test(diaParam)
    ? diaParam
    : claveMes(mes) === claveMes(new Date())
      ? hoy
      : `${claveMes(mes)}-01`;

  const { desde, hasta } = rangoVisible(mes);
  const supabase = await createClient();

  let consulta = supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, scheduled_for, assigned_to, profiles!inspections_assigned_to_fkey(id, full_name)"
    )
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", desde.toISOString())
    .lt("scheduled_for", hasta.toISOString())
    .neq("status", "cancelled")
    .order("scheduled_for", { ascending: true });

  if (inspectorFiltro) {
    consulta = consulta.eq("assigned_to", inspectorFiltro);
  }

  const [{ data }, { data: inspectores }] = await Promise.all([
    consulta,
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "inspector")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const listaInspectores = (inspectores ?? []).map((i) => ({
    id: i.id,
    nombre: i.full_name,
  }));

  type Fila = {
    id: string;
    display_id: string;
    customer_name: string | null;
    tractor_number: string | null;
    scheduled_for: string | null;
    assigned_to: string | null;
    profiles: { id: string; full_name: string } | null;
  };

  const filas = (data ?? []) as unknown as Fila[];

  const eventos: EventoCalendario[] = filas
    .filter((i) => i.scheduled_for)
    .map((i) => {
      const cuando = new Date(i.scheduled_for as string);
      return {
        id: i.id,
        dia: claveDia(cuando),
        hora: format(cuando, "HH:mm"),
        titulo: i.customer_name ?? i.display_id,
        persona: i.profiles?.full_name ?? (i.tractor_number || null),
        color: colorPorId(i.assigned_to),
        href: `/inspeccion/${i.id}`,
      };
    });

  const delDia = eventos.filter((e) => e.dia === diaActivo);
  const fechaDia = new Date(`${diaActivo}T12:00:00`);

  function hrefMes(clave: string) {
    const q = new URLSearchParams({ mes: clave });
    if (inspectorFiltro) q.set("inspector", inspectorFiltro);
    return `/admin/calendario?${q}`;
  }

  function hrefDia(clave: string) {
    const q = new URLSearchParams({ mes: claveMes(mes), dia: clave });
    if (inspectorFiltro) q.set("inspector", inspectorFiltro);
    return `/admin/calendario?${q}`;
  }

  return (
    <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Calendario
          </h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Toca un día, precarga la inspección y asígnala al inspector.
          </p>
        </div>
        <BotonProgramar
          inspectores={listaInspectores}
          fechaInicial={aDatetimeLocal(inicioTurno(fechaDia))}
          inspectorInicial={inspectorFiltro || undefined}
          etiqueta="Programar"
        />
      </div>

      {listaInspectores.length > 0 && (
        <nav aria-label="Filtrar por inspector" className="mb-4">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <li className="shrink-0">
              <Link
                href={`/admin/calendario?mes=${claveMes(mes)}&dia=${diaActivo}`}
                aria-current={!inspectorFiltro ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium",
                  !inspectorFiltro
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line bg-surface text-ink-secondary"
                )}
              >
                Todos
              </Link>
            </li>
            {listaInspectores.map((i) => {
              const activo = inspectorFiltro === i.id;
              const q = new URLSearchParams({
                mes: claveMes(mes),
                dia: diaActivo,
                inspector: i.id,
              });
              return (
                <li key={i.id} className="shrink-0">
                  <Link
                    href={`/admin/calendario?${q}`}
                    aria-current={activo ? "page" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium",
                      activo
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-line bg-surface text-ink-secondary"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        colorPorId(i.id),
                        activo && "ring-2 ring-white/70"
                      )}
                      aria-hidden
                    />
                    {i.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <CalendarioMes
        mes={mes}
        eventos={eventos}
        diaActivo={diaActivo}
        hrefMes={hrefMes}
        hrefDia={hrefDia}
      />

      {eventos.length === 0 && (
        <Card className="mt-4 flex items-start gap-3 p-4">
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
          <p className="text-sm text-ink-secondary">
            Este mes no tiene inspecciones programadas. Elige un día y
            precárgala: transportista, unidad y a quién le toca.
          </p>
        </Card>
      )}

      <ListaDia
        fecha={fechaDia}
        eventos={delDia}
        vacio="Nada programado este día. Precárgala y asígnala para que aparezca en el calendario del inspector."
        accion={
          <BotonProgramar
            inspectores={listaInspectores}
            fechaInicial={aDatetimeLocal(inicioTurno(fechaDia))}
            inspectorInicial={inspectorFiltro || undefined}
          />
        }
      />
    </main>
  );
}
