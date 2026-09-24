"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { esActivo, NAV_OPERATIVO } from "./nav-items";

/**
 * Barra de pestañas inferior. Visible en teléfono y iPad; en escritorio
 * cede su lugar al riel lateral.
 *
 * Va abajo porque es donde llega el pulgar. En una app que se usa de pie,
 * con una mano y a veces con guantes, la navegación arriba es inalcanzable.
 *
 * `pb-safe` no es opcional: sin él, en un iPhone la última fila de íconos
 * queda debajo de la barra de gestos y se toca el sistema en vez de la app.
 */
export function TabBar({
  esAdmin,
  esSuperAdmin,
}: {
  esAdmin: boolean;
  esSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const items = NAV_OPERATIVO.filter(
    (i) => (!i.soloAdmin || esAdmin) && (!i.soloSuper || esSuperAdmin)
  );

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-line bg-surface/85 backdrop-blur-xl",
        "shadow-[var(--shadow-bar)] pb-safe px-safe"
      )}
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const activo = esActivo(item.href, pathname);
          const Icono = item.icono;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5",
                  "transition-colors active:bg-surface-sunken",
                  activo ? "text-brand-600" : "text-ink-muted"
                )}
              >
                <Icono
                  className="size-6 shrink-0"
                  // El relleno refuerza el estado activo para quien no
                  // distingue el cambio de color.
                  strokeWidth={activo ? 2.4 : 1.8}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    activo ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.etiqueta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
