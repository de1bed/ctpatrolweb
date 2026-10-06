import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Zona horaria de quien ve la pantalla.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * El servidor corre en UTC. Todo lo que se formateaba ahí salía 6 horas
 * adelante de México: una inspección programada a las 9:00 aparecía a las
 * 15:00, una de las 19:00 caía en el día siguiente del calendario, y la hora
 * al pie de cada foto no coincidía con la que trae impresa la propia foto.
 *
 * ── La solución ─────────────────────────────────────────────────────────────
 *
 * El navegador guarda su zona en una cookie (RegistrarZona) y el servidor
 * formatea con ella. Sin cookie todavía —primera visita— se usa la de
 * Ciudad de México y la página se refresca sola en cuanto la cookie existe.
 *
 * Las fechas se guardan igual que siempre (instantes UTC): esto solo cambia
 * cómo se muestran y cómo se agrupan por día.
 */

export const ZONA_POR_DEFECTO = "America/Mexico_City";
export const COOKIE_ZONA = "tz";

/** La zona si el motor de fechas la reconoce; si no, la de por defecto. */
export function zonaValida(tz: string | null | undefined): string {
  if (tz) {
    try {
      const limpia = decodeURIComponent(tz);
      new Intl.DateTimeFormat("en-US", { timeZone: limpia });
      return limpia;
    } catch {
      // Zona inventada o mal escrita: se ignora.
    }
  }
  return ZONA_POR_DEFECTO;
}

const formateadores = new Map<string, Intl.DateTimeFormat>();

function partes(instante: Date, tz: string) {
  let f = formateadores.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formateadores.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(instante)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/**
 * La hora "de pared" en la zona, como un Date local.
 *
 * Sus getters locales (getHours, getDate…) y `format` de date-fns dan la hora
 * que vería alguien en esa zona, sin importar la zona del servidor. Sirve
 * para mostrar y para agrupar; NO para guardar ni para consultar la base.
 */
export function aZona(fecha: Date | string | number, tz: string): Date {
  const instante = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(instante.getTime())) return instante;
  const p = partes(instante, tz);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, instante.getMilliseconds());
}

/**
 * Lo contrario de aZona: una hora de pared (un Date local) al instante real.
 * Es lo que se usa para consultar la base, p. ej. "desde el lunes a las 00:00
 * en México".
 */
export function desdeZona(pared: Date, tz: string): Date {
  const comoUtc = Date.UTC(
    pared.getFullYear(),
    pared.getMonth(),
    pared.getDate(),
    pared.getHours(),
    pared.getMinutes(),
    pared.getSeconds(),
    pared.getMilliseconds()
  );
  const desfase = (t: number) => {
    const p = partes(new Date(t), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, new Date(t).getUTCMilliseconds()) - t;
  };
  let t = comoUtc - desfase(comoUtc);
  // Segunda pasada por si el desfase cambia en medio (horario de verano).
  const d2 = desfase(t);
  if (comoUtc - d2 !== t) t = comoUtc - d2;
  return new Date(t);
}

/** `format` de date-fns, en español y en la zona indicada. */
export function formatoEnZona(
  fecha: Date | string | number,
  patron: string,
  tz: string
): string {
  const pared = aZona(fecha, tz);
  if (Number.isNaN(pared.getTime())) return "—";
  return format(pared, patron, { locale: es });
}
