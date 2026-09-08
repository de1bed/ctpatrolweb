"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Barra de acciones del reporte.
 *
 * Lleva la clase `no-imprimir`: en la hoja impresa no debe salir ni el botón
 * de imprimir ni el de regresar. Es la razón de que el reporte tenga su
 * propio CSS en vez de reusar el de la app.
 */
export function BarraReporte({
  inspeccionId,
  folio,
}: {
  inspeccionId: string;
  folio: string;
}) {
  return (
    <div className="no-imprimir sticky top-0 z-30 border-b border-line bg-surface/90 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-gutter">
        <Link
          href={`/inspeccion/${inspeccionId}`}
          aria-label="Volver a la inspección"
          className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
        >
          <ArrowLeft className="size-6" aria-hidden />
        </Link>

        <p className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-ink">
          {folio}
        </p>

        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
