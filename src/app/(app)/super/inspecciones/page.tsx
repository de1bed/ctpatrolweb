import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import type { Metadata } from "next";

import { AppHeader } from "@/components/shell/app-header";
import { StatusBadge } from "@/components/inspection/status-badge";
import { Card } from "@/components/ui/card";
import { requerirSuperAdmin } from "@/lib/auth";
import { purgarInspeccionesExpiradas } from "@/lib/inspecciones/purgar";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Inspecciones · Plataforma" };
export const dynamic = "force-dynamic";

const PAGINA = 50;

type Fila = {
  id: string;
  display_id: string;
  status: Database["public"]["Enums"]["inspection_status"];
  customer_name: string | null;
  tractor_number: string | null;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  company_accounts: { name: string } | null;
};

export default async function SuperInspeccionesPage({
  searchParams,
}: PageProps<"/super/inspecciones">) {
  const sesion = await requerirSuperAdmin();
  await purgarInspeccionesExpiradas();

  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const desde = (pagina - 1) * PAGINA;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, updated_at, completed_at, deleted_at, company_accounts(name)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(desde, desde + PAGINA - 1);
  const filas = (data ?? []) as unknown as Fila[];
  const total = count ?? filas.length;
  const hayMas = desde + filas.length < total;

  return (
    <>
      <AppHeader titulo="Inspecciones" nombreUsuario={sesion.nombre} nombreCuenta="CTPatrol" />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-4 text-sm text-ink-secondary">
          Todas las empresas, juntas: abiertas, terminadas y eliminadas. Cada
          una lleva su etiqueta. Las eliminadas siguen aquí 30 días.
        </p>

        <p className="mb-3 text-sm text-ink-muted">{total} inspecciones</p>

        <div className="flex flex-col gap-3">
          {filas.length === 0 && (
            <Card className="p-6 text-sm text-ink-secondary">No hay inspecciones aquí.</Card>
          )}
          {filas.map((fila) => (
            <Card key={fila.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge estado={fila.status} />
                {fila.deleted_at && (
                  <span className="inline-flex items-center rounded-full border border-danger-500/40 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                    Eliminada
                  </span>
                )}
                <span className="font-mono text-sm text-ink">{fila.display_id}</span>
              </div>
              <p className="mt-2 font-medium text-ink">
                {fila.company_accounts?.name ?? "Empresa"}
              </p>
              <p className="text-sm text-ink-secondary">
                {[fila.customer_name, fila.tractor_number].filter(Boolean).join(" · ") || "Sin datos"}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {fila.deleted_at
                  ? `Eliminada ${format(new Date(fila.deleted_at), "d MMM yyyy", { locale: es })} · quedan ${diasRestantes(fila.deleted_at)} días`
                  : `Actualizada ${format(new Date(fila.updated_at), "d MMM yyyy HH:mm", { locale: es })}`}
              </p>
              <Link
                href={`/inspeccion/${fila.id}/reporte`}
                className="mt-2 inline-block text-sm font-medium text-brand-600"
              >
                Ver reporte
              </Link>
            </Card>
          ))}
        </div>

        {hayMas && (
          <Link
            href={`/super/inspecciones?pagina=${pagina + 1}`}
            className="mt-4 inline-block text-sm font-medium text-brand-600"
          >
            Ver siguientes
          </Link>
        )}
      </main>
    </>
  );
}

function diasRestantes(deletedAt: string): number {
  const vence = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((vence - Date.now()) / (24 * 60 * 60 * 1000)));
}
