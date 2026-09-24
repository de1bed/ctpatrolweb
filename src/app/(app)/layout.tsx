import { SideRail } from "@/components/shell/side-rail";
import { TabBar } from "@/components/shell/tab-bar";
import { requerirSesion } from "@/lib/auth";

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

  return (
    <div className="min-h-screen-safe bg-surface-sunken">
      <SideRail esAdmin={sesion.esAdmin} esSuperAdmin={sesion.esSuperAdmin} />

      <div className="lg:pl-64">
        {children}
      </div>

      <TabBar esAdmin={sesion.esAdmin} esSuperAdmin={sesion.esSuperAdmin} />
    </div>
  );
}
