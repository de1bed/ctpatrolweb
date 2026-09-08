import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases resolviendo conflictos de Tailwind.
 *
 * Sin esto, `cn("p-2", "p-4")` dejaría ambas y ganaría la que el CSS tenga
 * más abajo — que no siempre es la que uno espera. twMerge se queda con la
 * última, que es lo intuitivo y lo que permite que un componente acepte
 * `className` para sobrescribir su estilo por defecto.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
