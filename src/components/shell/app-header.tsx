"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cerrarSesion } from "@/app/login/actions";
import { cn } from "@/lib/cn";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Encabezado de la app.
 *
 * Pegado arriba y translúcido: el contenido se desliza por debajo, que es el
 * gesto que hace que una web se sienta app. `pt-safe` lo empuja debajo del
 * notch en iPhone.
 */
export function AppHeader({
  titulo,
  nombreUsuario,
  nombreCuenta,
}: {
  titulo: string;
  nombreUsuario: string;
  nombreCuenta: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cerrar al tocar fuera o al presionar Escape. Sin esto el menú se queda
  // pegado y hay que recargar para quitarlo.
  useEffect(() => {
    if (!abierto) return;

    function alTocarFuera(e: MouseEvent | TouchEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("touchstart", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("touchstart", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-xl">
      {/* px-gutter (no px-safe aquí) para que el título quede alineado con el
          contenido de la página, incluso en horizontal con notch a un lado. */}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-gutter">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-ink">
            {titulo}
          </h1>
          <p className="truncate text-xs leading-tight text-ink-muted">
            {nombreCuenta}
          </p>
        </div>

        <div className="relative shrink-0" ref={contenedor}>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-haspopup="menu"
            aria-expanded={abierto}
            aria-label={`Cuenta de ${nombreUsuario}`}
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              "bg-brand-600 text-sm font-bold text-white",
              "transition-transform active:scale-95"
            )}
          >
            {iniciales(nombreUsuario)}
          </button>

          {abierto && (
            <div
              role="menu"
              className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-line bg-surface-overlay shadow-lg"
            >
              <div className="border-b border-line px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <User className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  <span className="truncate">{nombreUsuario}</span>
                </p>
              </div>

              <Link
                href="/ajustes"
                role="menuitem"
                onClick={() => setAbierto(false)}
                className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-base text-ink-secondary hover:bg-surface-sunken"
              >
                <Settings className="size-5 shrink-0" aria-hidden />
                Ajustes
              </Link>

              <form action={cerrarSesion}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-base text-danger-600 hover:bg-surface-sunken"
                >
                  <LogOut className="size-5 shrink-0" aria-hidden />
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
