"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { esActivo, NAV_AJUSTES, NAV_OPERATIVO } from "./nav-items";

/**
 * Riel lateral. Solo en escritorio (lg+).
 *
 * A partir de cierto ancho, una barra inferior se ve perdida y desperdicia
 * el espacio horizontal que sobra. El riel usa ese espacio y deja la altura
 * completa para el contenido, que es lo que el admin necesita cuando está
 * viendo tablas.
 */
export function SideRail({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();
  const items = NAV_OPERATIVO.filter((i) => !i.soloAdmin || esAdmin);
  const IconoAjustes = NAV_AJUSTES.icono;

  return (
    <aside
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex"
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src="/icons/icon.svg"
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-xl"
        />
        <span className="text-lg font-bold tracking-tight text-ink">
          CTPatrol
        </span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const activo = esActivo(item.href, pathname);
            const Icono = item.icono;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-colors",
                    activo
                      ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      : "font-medium text-ink-secondary hover:bg-surface-sunken hover:text-ink"
                  )}
                >
                  <Icono className="size-5 shrink-0" aria-hidden />
                  {item.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <Link
          href={NAV_AJUSTES.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
            esActivo(NAV_AJUSTES.href, pathname)
              ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              : "text-ink-secondary hover:bg-surface-sunken hover:text-ink"
          )}
        >
          <IconoAjustes className="size-5 shrink-0" aria-hidden />
          {NAV_AJUSTES.etiqueta}
        </Link>
      </div>
    </aside>
  );
}
