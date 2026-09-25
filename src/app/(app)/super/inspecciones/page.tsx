import type { Metadata } from "next";

import { AppHeader } from "@/components/shell/app-header";
import { requerirSuperAdmin } from "@/lib/auth";
import { purgarInspeccionesExpiradas } from "@/lib/inspecciones/purgar";
import { createClient } from "@/lib/supabase/server";

import type { PersonaEmpresa } from "../miembros";
import { ListaSuper, type FilaSuper, type GrupoSuper } from "./lista";

export const metadata: Metadata = { title: "Plataforma" };
export const dynamic = "force-dynamic";

/** Columnas cortas, sin el JSON de la inspección. Con muchas empresas igual cabe. */
const LIMITE = 2000;

export default async function SuperInspeccionesPage() {
  const sesion = await requerirSuperAdmin();
  await purgarInspeccionesExpiradas();

  const supabase = await createClient();
  const [{ data: empresas }, { data: perfiles }, { data: inspecciones }, { data: consumos }] =
    await Promise.all([
      supabase
        .from("company_accounts")
        .select("id, name, code, is_active, ia_plataforma, ia_activa, creditos_ia")
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active, company_account_id")
        .order("full_name"),
      supabase
        .from("inspections")
        .select(
          "id, display_id, status, customer_name, tractor_number, driver_name, company_account_id, updated_at, completed_at, deleted_at"
        )
        .order("updated_at", { ascending: false })
        .limit(LIMITE),
      supabase
        .from("ia_movimientos")
        .select("company_account_id")
        .eq("tipo", "consumo")
        .eq("reembolsado", false),
    ]);

  const usos = new Map<string, number>();
  for (const fila of consumos ?? []) {
    usos.set(fila.company_account_id, (usos.get(fila.company_account_id) ?? 0) + 1);
  }

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

  const gente = new Map<string, PersonaEmpresa[]>();
  for (const perfil of perfiles ?? []) {
    const lista = gente.get(perfil.company_account_id) ?? [];
    lista.push({
      id: perfil.id,
      nombre: perfil.full_name,
      email: perfil.email,
      rol: perfil.role,
      activo: perfil.is_active,
    });
    gente.set(perfil.company_account_id, lista);
  }

  const grupos: GrupoSuper[] = (empresas ?? []).map((empresa) => {
    const personas = gente.get(empresa.id) ?? [];
    return {
      id: empresa.id,
      name: empresa.name,
      code: empresa.code,
      activa: empresa.is_active,
      iaAutorizada: empresa.ia_plataforma,
      iaEncendida: empresa.ia_activa,
      creditos: empresa.creditos_ia,
      usosIa: usos.get(empresa.id) ?? 0,
      admins: personas.filter((p) => p.rol === "admin" || p.rol === "super_admin"),
      participantes: personas.filter((p) => p.rol === "inspector"),
      filas: porEmpresa.get(empresa.id) ?? [],
    };
  });

  return (
    <>
      <AppHeader titulo="Plataforma" nombreUsuario={sesion.nombre} nombreCuenta="CTPatrol" />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-4 text-sm text-ink-secondary">
          Cada empresa va plegada. Ábrela para créditos, IA, suspensión y sus inspecciones.
          Las eliminadas siguen 30 días.
        </p>
        <ListaSuper
          grupos={grupos}
          recortada={(inspecciones ?? []).length >= LIMITE}
          yoId={sesion.userId}
        />
      </main>
    </>
  );
}
