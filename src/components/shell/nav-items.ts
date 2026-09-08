import {
  ClipboardList,
  FolderOpen,
  Home,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Solo visible para admin. */
  soloAdmin?: boolean;
};

/**
 * Navegación del perfil operativo.
 *
 * Cuatro destinos, no seis. Una barra de pestañas con más de cinco íconos
 * deja de leerse de un vistazo y obliga a apuntar; con el teléfono en una
 * mano y a media inspección, eso se traduce en toques fallidos.
 *
 * "Ajustes" no está aquí: vive en el menú del avatar, arriba. Es algo que se
 * toca una vez al mes, no merece un cuarto del ancho de la barra.
 */
export const NAV_OPERATIVO: ItemNav[] = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/inspecciones", etiqueta: "Inspecciones", icono: ClipboardList },
  { href: "/expedientes", etiqueta: "Expedientes", icono: FolderOpen },
  { href: "/admin", etiqueta: "Admin", icono: ShieldCheck, soloAdmin: true },
];

export const NAV_AJUSTES: ItemNav = {
  href: "/ajustes",
  etiqueta: "Ajustes",
  icono: Settings,
};

/** Marca activa la pestaña de la sección actual, no solo la ruta exacta. */
export function esActivo(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
