import { ArrowLeft, Lock, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { obtenerPermisos, requerirSesion } from "@/lib/auth";

import { BotonCrear } from "./boton-crear";

export const metadata: Metadata = { title: "Nueva inspección" };

/**
 * Arranque de una inspección.
 *
 * Es una pantalla con botón y no una ruta que cree al entrar: un GET que
 * escribe en la base significa que recargar duplica la inspección, y volver
 * con el botón "atrás" también. La creación va por una acción de servidor,
 * que es una petición POST explícita.
 */
export default async function NuevaInspeccionPage() {
  const sesion = await requerirSesion();
  const permisos = await obtenerPermisos(sesion);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-gutter">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </Link>
          <h1 className="font-bold text-ink">Nueva inspección</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-gutter py-6">
        {permisos.puedeIniciarInspeccion ? (
          <>
            <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
                <Plus className="size-8 text-brand-600" aria-hidden />
              </span>
              <p className="text-lg font-semibold text-ink">
                Inspección C-TPAT
              </p>
              <p className="max-w-sm text-ink-secondary">
                Se te asignará un folio y arrancarás por la configuración
                inicial. El tipo de transporte que elijas define el resto del
                flujo.
              </p>
              <p className="text-sm text-ink-muted">
                Cuenta: {sesion.cuenta.name}
              </p>
            </Card>

            <div className="mt-5">
              <BotonCrear />
            </div>
          </>
        ) : (
          <Card className="flex items-start gap-3 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                No puedes iniciar inspecciones por tu cuenta
              </p>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Tu administrador no habilitó este permiso. Solo puedes trabajar
                las inspecciones que te asignen, y esas aparecen en tu inicio.
              </p>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
