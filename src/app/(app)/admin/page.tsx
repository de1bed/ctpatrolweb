import { subDays } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PauseCircle,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { InspectionCard } from "@/components/inspection/inspection-card";
import { Card } from "@/components/ui/card";

import { MetricasAdmin, type Cierre } from "./metricas";
import { requerirAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminResumenPage() {
  await requerirAdmin();
  const supabase = await createClient();

  const hace7 = subDays(new Date(), 7).toISOString();
  const hace30 = subDays(new Date(), 30).toISOString();

  // `head: true` pide solo el conteo, sin traerse las filas: el número es lo
  // único que se pinta y bajar los registros para contarlos sería tirar
  // ancho de banda.
  const conteo = (estado: "in_progress" | "paused" | "assigned") =>
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("status", estado)
      .then((r) => r.count ?? 0);

  // Todas en paralelo: son consultas independientes y en serie sumarían
  // medio segundo de espera para nada.
  const [
    enCurso,
    pausadas,
    asignadas,
    semana,
    rechazadasMes,
    completadasMes,
    inspectores,
    recientes,
    cierresMes,
  ] = await Promise.all([
    conteo("in_progress"),
    conteo("paused"),
    conteo("assigned"),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", hace7)
      .then((r) => r.count ?? 0),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .eq("passed", false)
      .gte("completed_at", hace30)
      .then((r) => r.count ?? 0),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", hace30)
      .then((r) => r.count ?? 0),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "inspector")
      .eq("is_active", true)
      .then((r) => r.count ?? 0),
    supabase
      .from("inspections")
      .select(
        "id, display_id, status, customer_name, tractor_number, updated_at, completed_at, passed, findings_count"
      )
      .order("updated_at", { ascending: false })
      .limit(6)
      .then((r) => r.data ?? []),
    supabase
      .from("inspections")
      .select("assigned_to, duration_seconds, passed, completed_at")
      .eq("status", "completed")
      .gte("completed_at", hace30)
      .limit(1000)
      .then((r) => (r.data ?? []) as Cierre[]),
  ]);

  const idsInspectores = [
    ...new Set(cierresMes.map((c) => c.assigned_to).filter((id): id is string => Boolean(id))),
  ];
  const { data: perfiles } = idsInspectores.length
    ? await supabase.from("profiles").select("id, full_name").in("id", idsInspectores)
    : { data: [] };
  const nombres = new Map((perfiles ?? []).map((p) => [p.id, p.full_name]));

  const tasaRechazo =
    completadasMes > 0 ? Math.round((rechazadasMes / completadasMes) * 100) : 0;

  const tarjetas = [
    {
      etiqueta: "En curso",
      valor: enCurso,
      icono: ClipboardList,
      tono: "brand" as const,
      href: "/admin/inspecciones?estado=in_progress",
    },
    {
      etiqueta: "Pausadas",
      valor: pausadas,
      icono: PauseCircle,
      tono: "warn" as const,
      href: "/admin/inspecciones?estado=paused",
    },
    {
      etiqueta: "Sin empezar",
      valor: asignadas,
      icono: Users,
      tono: "neutral" as const,
      href: "/admin/inspecciones?estado=assigned",
    },
    {
      etiqueta: "Cerradas (7 días)",
      valor: semana,
      icono: CheckCircle2,
      tono: "ok" as const,
      href: "/admin/inspecciones?estado=completed",
    },
  ];

  const tonos = {
    brand: "text-brand-600 bg-brand-50 dark:bg-brand-950",
    warn: "text-warn-600 bg-warn-50 dark:bg-warn-500/10",
    ok: "text-ok-600 bg-ok-50 dark:bg-ok-500/10",
    neutral: "text-ink-secondary bg-surface-sunken",
  };

  return (
    <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
      {/* ── Cifras ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((t) => {
          const Icono = t.icono;
          return (
            <Link key={t.etiqueta} href={t.href}>
              <Card interactive className="p-4 hover:border-line-strong">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    tonos[t.tono]
                  )}
                >
                  <Icono className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-3xl font-bold tabular-nums text-ink">
                  {t.valor}
                </p>
                <p className="text-sm text-ink-secondary">{t.etiqueta}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Link href="/admin/calendario" className="mt-3 block">
        <Card interactive className="flex items-center gap-3 p-4 hover:border-line-strong">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              tonos.brand
            )}
          >
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Calendario</p>
            <p className="text-sm text-ink-secondary">
              Precarga una inspección, asígnala y queda en la agenda del
              inspector.
            </p>
          </div>
        </Card>
      </Link>

      {/* ── Calidad ────────────────────────────────────────────────────── */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tasaRechazo > 20 ? tonos.warn : tonos.ok
              )}
            >
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums text-ink">
                {tasaRechazo}%
              </p>
              <p className="text-sm text-ink-secondary">
                Tasa de rechazo · últimos 30 días
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {rechazadasMes} de {completadasMes} inspecciones cerradas
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tonos.brand
              )}
            >
              <TrendingUp className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums text-ink">
                {inspectores}
              </p>
              <p className="text-sm text-ink-secondary">Inspectores activos</p>
              <Link
                href="/admin/inspectores"
                className="mt-1 inline-block text-xs font-medium text-brand-600"
              >
                Ver y gestionar permisos
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <MetricasAdmin cierres={cierresMes} nombres={nombres} />

      {/* ── Actividad reciente ─────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Actividad reciente
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/calendario"
              className="text-sm font-medium text-brand-600"
            >
              Calendario
            </Link>
            <Link
              href="/admin/inspecciones"
              className="text-sm font-medium text-brand-600"
            >
              Ver todas
            </Link>
          </div>
        </div>

        {recientes.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <p className="font-medium text-ink">Todavía no hay inspecciones</p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recientes.map((i) => (
              <li key={i.id}>
                <InspectionCard inspeccion={i} mostrarResultado />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
