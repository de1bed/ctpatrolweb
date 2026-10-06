import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * "10:32" si fue hoy, "5 oct, 10:32" si no. Para avisos de autoría, donde
 * importa ubicar el cambio, no la fecha completa.
 */
export function formatearMomentoCorto(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mismoDia = d.toDateString() === ahora.toDateString();
  return format(d, mismoDia ? "HH:mm" : "d MMM, HH:mm", { locale: es });
}
