import type { Metadata } from "next";

import Link from "next/link";

import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { ControlesEmpresa } from "./controles";
import { ListaMiembros, type PersonaEmpresa } from "./miembros";

export const metadata: Metadata = { title: "Plataforma" };
export const dynamic = "force-dynamic";

export default async function SuperPage() {
  const sesion = await requerirSuperAdmin();
  const supabase = await createClient();

  const [{ data: empresas }, { data: perfiles }, { data: inspecciones }, { data: consumos }] =
    await Promise.all([
      supabase
        .from("company_accounts")
        .select("id, code, name, is_active, ia_plataforma, ia_activa, creditos_ia, created_at")
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active, company_account_id, created_at")
        .order("full_name"),
      supabase.from("inspections").select("company_account_id").is("deleted_at", null),
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

  const conteoInspecciones = new Map<string, number>();
  for (const fila of inspecciones ?? []) {
    conteoInspecciones.set(
      fila.company_account_id,
      (conteoInspecciones.get(fila.company_account_id) ?? 0) + 1
    );
  }

  const porEmpresa = new Map<string, PersonaEmpresa[]>();
  for (const perfil of perfiles ?? []) {
    const lista = porEmpresa.get(perfil.company_account_id) ?? [];
    lista.push({
      id: perfil.id,
      nombre: perfil.full_name,
      email: perfil.email,
      rol: perfil.role,
      activo: perfil.is_active,
    });
    porEmpresa.set(perfil.company_account_id, lista);
  }

  const totalPersonas = perfiles?.length ?? 0;
  const totalAdmins = (perfiles ?? []).filter((p) => p.role === "admin").length;

  return (
    <>
      <AppHeader
        titulo="Plataforma"
        nombreUsuario={sesion.nombre}
        nombreCuenta="CTPatrol"
      />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-2 text-sm text-ink-secondary">
          {(empresas ?? []).length} empresas · {totalAdmins} admins · {totalPersonas}{" "}
          personas · {(inspecciones ?? []).length} inspecciones
        </p>
        <p className="mb-3 text-sm text-ink-secondary">
          Suspender una empresa cierra la sesión de todo su equipo. Tú sigues
          entrando para poder reactivarla.
        </p>
        <p className="mb-5">
          <Link href="/super/inspecciones" className="text-sm font-medium text-brand-600">
            Ver inspecciones de todas las empresas
          </Link>
        </p>
        <div className="flex flex-col gap-4">
          {(empresas ?? []).map((empresa) => {
            const gente = porEmpresa.get(empresa.id) ?? [];
            const admins = gente.filter((p) => p.rol === "admin" || p.rol === "super_admin");
            const participantes = gente.filter((p) => p.rol === "inspector");

            return (
              <Card key={empresa.id} className="flex flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-ink">{empresa.name}</h2>
                    <p className="font-mono text-sm text-ink-muted">{empresa.code}</p>
                  </div>
                  <p className="text-right text-sm text-ink-secondary">
                    {empresa.is_active ? "Activa" : "Suspendida"}
                    <br />
                    {conteoInspecciones.get(empresa.id) ?? 0} inspecciones
                    <br />
                    {usos.get(empresa.id) ?? 0} usos de IA
                    <br />
                    {empresa.ia_activa ? "IA encendida" : "IA apagada"} en la empresa
                  </p>
                </div>

                <ListaMiembros titulo="Admins" personas={admins} yoId={sesion.userId} />
                <ListaMiembros
                  titulo="Participantes"
                  personas={participantes}
                  yoId={sesion.userId}
                />
                {gente.length === 0 && (
                  <p className="text-sm text-ink-muted">Esta empresa no tiene personas.</p>
                )}

                <ControlesEmpresa
                  empresaId={empresa.id}
                  autorizada={empresa.ia_plataforma}
                  creditos={empresa.creditos_ia}
                  empresaActiva={empresa.is_active}
                />
              </Card>
            );
          })}
          {(empresas ?? []).length === 0 && (
            <Card className="p-4 text-sm text-ink-secondary">
              Todavía no hay empresas registradas.
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
