import type { Metadata } from "next";

import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { ControlesEmpresa } from "./controles";

export const metadata: Metadata = { title: "Plataforma" };
export const dynamic = "force-dynamic";

export default async function SuperPage() {
  const sesion = await requerirSuperAdmin();
  const supabase = await createClient();

  const { data: empresas } = await supabase
    .from("company_accounts")
    .select("id, code, name, is_active, ia_plataforma, ia_activa, creditos_ia")
    .order("name");

  const { data: consumos } = await supabase
    .from("ia_movimientos")
    .select("company_account_id")
    .eq("tipo", "consumo")
    .eq("reembolsado", false);

  const usos = new Map<string, number>();
  for (const fila of consumos ?? []) {
    usos.set(fila.company_account_id, (usos.get(fila.company_account_id) ?? 0) + 1);
  }

  return (
    <>
      <AppHeader
        titulo="Plataforma"
        nombreUsuario={sesion.nombre}
        nombreCuenta="CTPatrol"
      />
      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <p className="mb-5 text-sm text-ink-secondary">
          Desde aquí decides qué empresa puede usar el análisis con IA y cuántos
          créditos tiene. Cada foto analizada y cada documento escaneado gasta 1
          crédito. El admin de la empresa puede apagarlo en sus inspecciones
          aunque tú lo hayas autorizado.
        </p>
        <div className="flex flex-col gap-4">
          {(empresas ?? []).map((empresa) => (
            <Card key={empresa.id} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{empresa.name}</h2>
                  <p className="font-mono text-sm text-ink-muted">{empresa.code}</p>
                </div>
                <p className="text-right text-sm text-ink-secondary">
                  {usos.get(empresa.id) ?? 0} usos
                  <br />
                  {empresa.ia_activa ? "Encendida en la empresa" : "Apagada en la empresa"}
                </p>
              </div>
              <ControlesEmpresa
                empresaId={empresa.id}
                autorizada={empresa.ia_plataforma}
                creditos={empresa.creditos_ia}
              />
            </Card>
          ))}
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
