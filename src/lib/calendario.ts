import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

/** Semana que empieza en lunes: es como se trabaja el patio. */
const SEMANA = { weekStartsOn: 1 as const };

export function mesDesdeParam(valor: string | undefined): Date {
  if (valor && /^\d{4}-\d{2}$/.test(valor)) {
    const [y, m] = valor.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

export function claveMes(fecha: Date): string {
  return format(fecha, "yyyy-MM");
}

export function claveDia(fecha: Date): string {
  return format(fecha, "yyyy-MM-dd");
}

export function etiquetaMes(fecha: Date): string {
  return format(fecha, "LLLL yyyy", { locale: es });
}

export function mesAnterior(fecha: Date): string {
  return claveMes(addMonths(fecha, -1));
}

export function mesSiguiente(fecha: Date): string {
  return claveMes(addMonths(fecha, 1));
}

/**
 * Rango que cubre la rejilla del mes, incluyendo los días del mes vecino.
 *
 * `hasta` es exclusivo: sirve para filtrar `scheduled_for` con `< hasta`
 * y no dejar fuera el último domingo a las 23:59.
 */
export function rangoVisible(mes: Date): { desde: Date; hasta: Date } {
  const desde = startOfWeek(startOfMonth(mes), SEMANA);
  const hasta = addDays(endOfWeek(endOfMonth(mes), SEMANA), 1);
  return { desde, hasta };
}

export function diasDelCalendario(mes: Date): Date[] {
  const { desde, hasta } = rangoVisible(mes);
  return eachDayOfInterval({ start: desde, end: addDays(hasta, -1) });
}

export function esDelMes(dia: Date, mes: Date): boolean {
  return isSameMonth(dia, mes);
}

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** datetime-local en la zona del navegador/servidor local. */
export function aDatetimeLocal(fecha: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}T${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}

export function inicioTurno(dia: Date): Date {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 8, 0, 0);
}

const COLORES = [
  "bg-brand-600 text-white",
  "bg-ok-600 text-white",
  "bg-warn-600 text-white",
  "bg-ink text-white",
  "bg-danger-600 text-white",
] as const;

/** Hasta aquí “hace 2 días” se entiende. Después, la fecha. */
const DIAS_RELATIVO = 7;

export function fechaEnLista(iso: string): string {
  const fecha = new Date(iso);
  if (differenceInDays(new Date(), fecha) < DIAS_RELATIVO) {
    return formatDistanceToNow(fecha, { addSuffix: true, locale: es });
  }
  return format(fecha, "d MMM yyyy, HH:mm", { locale: es });
}

export function colorPorId(id: string | null): string {
  if (!id) return "bg-surface-sunken text-ink-secondary border border-line";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 2147483647;
  return COLORES[Math.abs(h) % COLORES.length];
}
