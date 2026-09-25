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

type Fila = {
  id: string;
  display_id: string;
  status: Database["public"]["Enums"]["inspection_status"];
  customer_name: string | null;
  tractor_number: string | null;
  driver_name: string | null;
  company_account_id: string;
  updated_at: string;
  deleted_at: string | null;
};

export default async function SuperInspeccionesPage() {
  const sesion = await requerirSuperAdmin();
  await purgarInspeccionesExpiradas();

  const supabase = await createClient();
  const [{ data: empresas }, { data: inspecciones }] = await Promise.all([
    supabase.from("company_accounts").select("id, name, code").order("name"),
    supabase
      .from("inspections")
      .select(
        "id, display_id, status, customer_name, tractor_number, driver_name, company_account_id, updated_at, deleted_at"
      )
      .order("updated_at", { ascending: false })
      .limit(400),
  ]);

  const porEmpresa = new Map<string, Fila[]>();
  for (const fila of (inspecciones ?? []) as Fila[]) {
    const lista = porEmpresa.get(fila.company_account_id) ?? [];
    lista.push(fila);
    porEmpresa.set(fila.company_account_id, lista);
  }

  const grupos = (empresas ?? [])
    .map((empresa) => ({
      ...empresa,
      filas: porEmpresa.get(empresa.id) ?? [],
    }))
    .filter((g) => g.filas.length > 0);

  const total = (inspecciones ?? []).length;

  return (
    <>
      <AppHeader titulo="Inspecciones" nombreUsuario={sesion.nombre} nombreCuenta="CTPatrol" />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-5 text-sm text-ink-secondary">
          {grupos.length} {grupos.length === 1 ? "empresa" : "empresas"} · {total}{" "}
          inspecciones. Las eliminadas siguen 30 días.
        </p>

        <div className="flex flex-col gap-8">
          {grupos.length === 0 && (
            <Card className="p-6 text-sm text-ink-secondary">No hay inspecciones.</Card>
          )}
          {grupos.map((empresa) => (
            <section key={empresa.id}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-ink">{empresa.name}</h2>
                <p className="font-mono text-xs text-ink-muted">
                  {empresa.code} · {empresa.filas.length}
                </p>
              </div>
              <Card className="divide-y divide-line overflow-hidden">
                {empresa.filas.map((fila) => {
                  const detalle = [fila.customer_name, fila.tractor_number, fila.driver_name]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div key={fila.id} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge estado={fila.status} />
                        {fila.deleted_at && (
                          <span className="inline-flex items-center rounded-full border border-danger-500/40 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                            Eliminada
                          </span>
                        )}
                        <span className="font-mono text-sm font-medium text-ink">
                          {fila.display_id}
                        </span>
                      </div>
                      <p className="text-sm text-ink-secondary">{detalle || "Sin transportista"}</p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-ink-muted">
                          {fila.deleted_at
                            ? `Eliminada ${format(new Date(fila.deleted_at), "d MMM yyyy", { locale: es })} · quedan ${diasRestantes(fila.deleted_at)} días`
                            : format(new Date(fila.updated_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                        <Link
                          href={`/inspeccion/${fila.id}/reporte`}
                          className="text-sm font-medium text-brand-600"
                        >
                          Reporte
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}

function diasRestantes(deletedAt: string): number {
  const vence = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((vence - Date.now()) / (24 * 60 * 60 * 1000)));
}
