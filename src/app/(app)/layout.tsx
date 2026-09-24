import { SideRail } from "@/components/shell/side-rail";
import { TabBar } from "@/components/shell/tab-bar";
import { CreditosProvider } from "@/components/shell/creditos";
import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Armazón del perfil operativo.
 *
 * Un solo layout responde a los tres tamaños:
 *
 *   teléfono   contenido a ancho completo + barra de pestañas abajo
 *   iPad       mismo esquema, contenido centrado con más aire
 *   escritorio riel lateral a la izquierda, sin barra inferior
 *
 * El padding inferior (`pb-24`) reserva el alto de la barra de pestañas.
 * Sin él, la última tarjeta de la lista queda tapada y parece que la
 * pantalla se cortó.
 */
export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  const sesion = await requerirSesion();
  const supabase = await createClient();
  const { data: cuenta } = await supabase
    .from("company_accounts")
    .select("creditos_ia")
    .eq("id", sesion.companyAccountId)
    .maybeSingle();

  return (
    <CreditosProvider inicial={cuenta?.creditos_ia ?? 0}>
    <div className="min-h-screen-safe bg-surface-sunken">
      <SideRail esAdmin={sesion.esAdmin} esSuperAdmin={sesion.esSuperAdmin} />

      <div className="lg:pl-64">
        {children}
      </div>

      <TabBar esAdmin={sesion.esAdmin} esSuperAdmin={sesion.esSuperAdmin} />
    </div>
    </CreditosProvider>
  );
}
