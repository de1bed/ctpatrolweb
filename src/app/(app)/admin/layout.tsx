import { Building2, Shield } from "lucide-react";
import Link from "next/link";

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
      {sesion.esSuperAdmin && <AvisoSuperAdmin empresa={sesion.cuenta.name} />}
      {children}
    </>
  );
}

/**
 * El super admin puede leer todas las empresas, pero este panel es el de la
 * suya. El aviso deja claro qué está viendo y dónde está la vista global,
 * para que la diferencia no se lea como datos mezclados.
 */
function AvisoSuperAdmin({ empresa }: { empresa: string }) {
  return (
    <div className="mx-auto max-w-5xl px-gutter pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-800 dark:bg-brand-950">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-ink-secondary">
          <Building2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
          <span>
            Estás viendo solo <strong className="text-ink">{empresa}</strong>. Cada
            empresa tiene sus propios usuarios, inspecciones y catálogos.
          </span>
        </p>
        <Link
          href="/super/inspecciones"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-600"
        >
          <Shield className="size-4" aria-hidden />
          Ver todas las empresas
        </Link>
      </div>
    </div>
  );
}
