"use client";

import { BarChart3, BookUser, CalendarDays, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/shell/app-header";
import { cn } from "@/lib/cn";

const SECCIONES = [
  { href: "/admin", etiqueta: "Resumen", icono: BarChart3 },
  { href: "/admin/calendario", etiqueta: "Calendario", icono: CalendarDays },
  { href: "/admin/inspecciones", etiqueta: "Inspecciones", icono: ClipboardList },
  { href: "/admin/inspectores", etiqueta: "Inspectores", icono: Users },
  { href: "/admin/catalogos", etiqueta: "Catálogos", icono: BookUser },
];

/**
 * Navegación del panel administrativo.
 *
 * Tiras horizontales con scroll en vez de un menú lateral propio: el admin
 * también entra desde el teléfono a revisar algo rápido, y un segundo menú
 * lateral no cabe junto al riel que ya existe en escritorio.
 */
export function AdminNav({
  nombreUsuario,
  nombreCuenta,
}: {
  nombreUsuario: string;
  nombreCuenta: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <AppHeader
        titulo="Administración"
        nombreUsuario={nombreUsuario}
        nombreCuenta={nombreCuenta}
      />

      <nav
        aria-label="Secciones de administración"
        className="sticky top-14 z-20 border-b border-line bg-surface/85 backdrop-blur-xl"
      >
        <ul className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-gutter">
          {SECCIONES.map((s) => {
            // Coincidencia exacta para /admin, por prefijo para el resto: si
            // no, "Resumen" se quedaría activo en todas las subsecciones.
            const activo =
              s.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(s.href);
            const Icono = s.icono;

            return (
              <li key={s.href} className="shrink-0">
                <Link
                  href={s.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors",
                    activo
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-ink-secondary hover:text-ink"
                  )}
                >
                  <Icono className="size-4 shrink-0" aria-hidden />
                  {s.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
