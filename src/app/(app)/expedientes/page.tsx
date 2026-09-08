import { FolderOpen, Search } from "lucide-react";
import type { Metadata } from "next";

import { InspectionCard } from "@/components/inspection/inspection-card";
import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expedientes" };

/**
 * Expedientes: inspecciones cerradas.
 *
 * La búsqueda va por parámetro de URL y se resuelve en el servidor, no con un
 * filtro en el cliente. Así el enlace de una búsqueda se puede compartir, y
 * no hay que bajar el histórico completo al teléfono para filtrarlo.
 */
export default async function ExpedientesPage({
  searchParams,
}: PageProps<"/expedientes">) {
  const sesion = await requerirSesion();
  const params = await searchParams;
  const termino = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();

  let consulta = supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, updated_at, completed_at, passed, findings_count"
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(100);

  if (termino) {
    // Se escapan comas y paréntesis: `or()` los usa como separadores de su
    // propia sintaxis, y sin escapar un término con coma rompe la consulta.
    const seguro = termino.replace(/[,()%]/g, " ").trim();
    if (seguro) {
      consulta = consulta.or(
        `display_id.ilike.%${seguro}%,customer_name.ilike.%${seguro}%,tractor_number.ilike.%${seguro}%`
      );
    }
  }

  const { data } = await consulta;
  const expedientes = data ?? [];

  return (
    <>
      <AppHeader
        titulo="Expedientes"
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
        {/* Formulario nativo con GET: funciona sin JavaScript y deja la
            búsqueda en la URL, que es lo que la hace compartible. */}
        <form method="GET" className="relative mb-5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={termino}
            placeholder="Folio, transportista o tractor"
            aria-label="Buscar en expedientes"
            className="w-full rounded-xl border border-line bg-surface-raised py-3 pl-11 pr-4 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
        </form>

        {expedientes.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <FolderOpen className="size-10 text-ink-muted/50" aria-hidden />
            <p className="font-medium text-ink">
              {termino ? "Sin resultados" : "Todavía no hay expedientes"}
            </p>
            <p className="max-w-xs text-sm text-ink-secondary">
              {termino
                ? `Nada coincide con “${termino}”.`
                : "Las inspecciones que cierres aparecen aquí."}
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {expedientes.map((i) => (
              <li key={i.id}>
                <InspectionCard inspeccion={i} mostrarResultado />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
