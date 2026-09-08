import { requerirAdmin } from "@/lib/auth";

import { AdminNav } from "./nav";

/**
 * Armazón del panel administrativo.
 *
 * `requerirAdmin` corre en el servidor ANTES de renderizar nada. No se
 * confía en que la barra de navegación oculte el enlace: quien teclee /admin
 * a mano se topa con esta puerta, no con la pantalla.
 *
 * Es la segunda de tres capas. La primera es que el enlace no se muestra; la
 * tercera —la única que de verdad no se puede brincar— es RLS en Postgres.
 */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const sesion = await requerirAdmin();

  return (
    <>
      <AdminNav nombreUsuario={sesion.nombre} nombreCuenta={sesion.cuenta.name} />
      {children}
    </>
  );
}
