import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { requerirAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import { FilaInspeccion, type InspeccionAdmin } from "./fila";
import { NuevaAsignada } from "./nueva-asignada";

export const metadata: Metadata = { title: "Inspecciones · Admin" };

type Estado = Database["public"]["Enums"]["inspection_status"];

const FILTROS: { valor: string; etiqueta: string }[] = [
  { valor: "abiertas", etiqueta: "Abiertas" },
  { valor: "draft", etiqueta: "Sin asignar" },
  { valor: "assigned", etiqueta: "Asignadas" },
  { valor: "in_progress", etiqueta: "En curso" },
  { valor: "paused", etiqueta: "Pausadas" },
  { valor: "completed", etiqueta: "Cerradas" },
  { valor: "cancelled", etiqueta: "Canceladas" },
  { valor: "todas", etiqueta: "Todas" },
];

export default async function AdminInspeccionesPage({
  searchParams,
}: PageProps<"/admin/inspecciones">) {
  await requerirAdmin();
  const params = await searchParams;

  const estado = typeof params.estado === "string" ? params.estado : "abiertas";
  const termino = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();

  let consulta = supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, driver_name, updated_at, completed_at, scheduled_for, passed, findings_count, assigned_to, verification_token, verification_revoked_at, profiles!inspections_assigned_to_fkey(id, full_name)"
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (estado === "abiertas") {
    consulta = consulta.in("status", [
      "draft",
      "assigned",
      "in_progress",
      "paused",
    ] satisfies Estado[]);
  } else if (estado !== "todas") {
    consulta = consulta.eq("status", estado as Estado);
  }

  if (termino) {
    const seguro = termino.replace(/[,()%]/g, " ").trim();
    if (seguro) {
      consulta = consulta.or(
        `display_id.ilike.%${seguro}%,customer_name.ilike.%${seguro}%,tractor_number.ilike.%${seguro}%`
      );
    }
  }

  const { data } = await consulta;
  const inspecciones = (data ?? []) as unknown as InspeccionAdmin[];

  // Solo inspectores activos pueden recibir asignaciones.
  const { data: inspectores } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "inspector")
    .eq("is_active", true)
    .order("full_name");

  const listaInspectores = (inspectores ?? []).map((i) => ({
    id: i.id,
    nombre: i.full_name,
  }));

  return (
    <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Inspecciones
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/calendario"
            className="flex min-h-11 items-center rounded-xl border border-line px-3.5 text-sm font-medium text-ink-secondary"
          >
            Calendario
          </Link>
          <NuevaAsignada inspectores={listaInspectores} />
        </div>
      </div>

      {/* Búsqueda por GET: la URL queda compartible y funciona sin JS. */}
      <form method="GET" className="relative mb-3">
        <input type="hidden" name="estado" value={estado} />
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={termino}
          placeholder="Folio, transportista o tractor"
          aria-label="Buscar inspecciones"
          className="w-full rounded-xl border border-line bg-surface-raised py-3 pl-11 pr-4 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </form>

      {/* Filtros como enlaces, no como botones con estado: así el filtro
          vive en la URL y se puede compartir o guardar en favoritos. */}
      <nav aria-label="Filtrar por estado" className="mb-5">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map((f) => {
            const activo = estado === f.valor;
            const query = new URLSearchParams({ estado: f.valor });
            if (termino) query.set("q", termino);

            return (
              <li key={f.valor} className="shrink-0">
                <Link
                  href={`/admin/inspecciones?${query}`}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                    activo
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line bg-surface text-ink-secondary"
                  )}
                >
                  {f.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {inspecciones.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <ClipboardList className="size-10 text-ink-muted/50" aria-hidden />
          <p className="font-medium text-ink">Nada que mostrar</p>
          <p className="max-w-xs text-sm text-ink-secondary">
            {termino
              ? `Nada coincide con “${termino}”.`
              : "No hay inspecciones con este filtro."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {inspecciones.map((i) => (
            <li key={i.id}>
              <FilaInspeccion inspeccion={i} inspectores={listaInspectores} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
