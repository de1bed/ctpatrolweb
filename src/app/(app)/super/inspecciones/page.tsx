import type { Metadata } from "next";

import { AppHeader } from "@/components/shell/app-header";
import { requerirSuperAdmin } from "@/lib/auth";
import { purgarInspeccionesExpiradas } from "@/lib/inspecciones/purgar";
import { createClient } from "@/lib/supabase/server";

import { ListaSuper, type FilaSuper, type GrupoSuper } from "./lista";

export const metadata: Metadata = { title: "Inspecciones · Plataforma" };
export const dynamic = "force-dynamic";

/** Columnas cortas, sin el JSON de la inspección. Con muchas empresas igual cabe. */
const LIMITE = 2000;

export default async function SuperInspeccionesPage() {
  const sesion = await requerirSuperAdmin();
  await purgarInspeccionesExpiradas();

  const supabase = await createClient();
  const [{ data: empresas }, { data: inspecciones }] = await Promise.all([
    supabase.from("company_accounts").select("id, name, code").order("name"),
    supabase
      .from("inspections")
      .select(
        "id, display_id, status, customer_name, tractor_number, driver_name, company_account_id, updated_at, completed_at, deleted_at"
      )
      .order("updated_at", { ascending: false })
      .limit(LIMITE),
  ]);

  const porEmpresa = new Map<string, FilaSuper[]>();
  for (const fila of inspecciones ?? []) {
    const lista = porEmpresa.get(fila.company_account_id) ?? [];
    lista.push({
      id: fila.id,
      display_id: fila.display_id,
      status: fila.status,
      customer_name: fila.customer_name,
      tractor_number: fila.tractor_number,
      driver_name: fila.driver_name,
      updated_at: fila.updated_at,
      completed_at: fila.completed_at,
      deleted_at: fila.deleted_at,
    });
    porEmpresa.set(fila.company_account_id, lista);
  }

  const grupos: GrupoSuper[] = (empresas ?? [])
    .map((empresa) => ({
      id: empresa.id,
      name: empresa.name,
      code: empresa.code,
      filas: porEmpresa.get(empresa.id) ?? [],
    }))
    .filter((grupo) => grupo.filas.length > 0);

  return (
    <>
      <AppHeader titulo="Inspecciones" nombreUsuario={sesion.nombre} nombreCuenta="CTPatrol" />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-4 text-sm text-ink-secondary">
          Cada empresa va plegada, por nombre. Ábrela para ver fechas y folios, o búscalo arriba.
          Las eliminadas siguen 30 días.
        </p>
        <ListaSuper grupos={grupos} recortada={(inspecciones ?? []).length >= LIMITE} />
      </main>
    </>
  );
}
