import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

import { Card } from "@/components/ui/card";

export type Cierre = {
  assigned_to: string | null;
  duration_seconds: number | null;
  passed: boolean | null;
  completed_at: string | null;
};

export function MetricasAdmin({
  cierres,
  nombres,
}: {
  cierres: Cierre[];
  nombres: Map<string, string>;
}) {
  const porDia = volumenPorDia(cierres);
  const maxDia = Math.max(1, ...porDia.map((d) => d.total));
  const inspectores = metricasPorInspector(cierres, nombres);
  const maxHechas = Math.max(1, ...inspectores.map((i) => i.hechas));

  const conTiempo = cierres.filter((c) => (c.duration_seconds ?? 0) > 0);
  const promedio =
    conTiempo.length > 0
      ? conTiempo.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / conTiempo.length
      : 0;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold tracking-tight text-ink">Últimos 30 días</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        El tiempo es el trabajo en pantalla, no las horas que la unidad estuvo
        esperando. Promedio: {promedio > 0 ? formatoDuracion(promedio) : "sin datos"}.
      </p>

      <Card className="mt-4 p-4">
        <h3 className="text-sm font-semibold text-ink">Inspecciones por día</h3>
        <ul className="mt-3 flex items-end gap-1">
          {porDia.map((d) => (
            <li key={d.clave} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-ink-muted">{d.total || ""}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t bg-brand-600"
                  style={{ height: `${Math.max(d.total ? 8 : 0, (d.total / maxDia) * 100)}%` }}
                  title={`${d.etiqueta}: ${d.total}`}
                />
              </div>
              <span className="text-[10px] text-ink-muted">{d.etiqueta}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-3 p-4">
        <h3 className="text-sm font-semibold text-ink">Por inspector</h3>
        {inspectores.length === 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">Todavía no hay inspecciones cerradas.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {inspectores.map((i) => (
              <li key={i.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-ink">{i.nombre}</p>
                  <p className="text-sm tabular-nums text-ink-secondary">
                    {i.hechas} · {i.promedio > 0 ? formatoDuracion(i.promedio) : "sin tiempo"}
                    {i.rechazadas > 0 && ` · ${i.rechazadas} rechazadas`}
                  </p>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${(i.hechas / maxHechas) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function volumenPorDia(cierres: Cierre[]) {
  const dias = Array.from({ length: 14 }, (_, i) => {
    const fecha = subDays(new Date(), 13 - i);
    return {
      clave: format(fecha, "yyyy-MM-dd"),
      etiqueta: format(fecha, "d", { locale: es }),
      total: 0,
    };
  });
  const indice = new Map(dias.map((d) => [d.clave, d]));
  for (const c of cierres) {
    if (!c.completed_at) continue;
    const dia = indice.get(format(new Date(c.completed_at), "yyyy-MM-dd"));
    if (dia) dia.total += 1;
  }
  return dias;
}

function metricasPorInspector(cierres: Cierre[], nombres: Map<string, string>) {
  const mapa = new Map<
    string,
    { id: string; nombre: string; hechas: number; rechazadas: number; segundos: number; conTiempo: number }
  >();

  for (const c of cierres) {
    const id = c.assigned_to ?? "sin-asignar";
    const actual = mapa.get(id) ?? {
      id,
      nombre: id === "sin-asignar" ? "Sin asignar" : (nombres.get(id) ?? "Inspector"),
      hechas: 0,
      rechazadas: 0,
      segundos: 0,
      conTiempo: 0,
    };
    actual.hechas += 1;
    if (c.passed === false) actual.rechazadas += 1;
    if ((c.duration_seconds ?? 0) > 0) {
      actual.segundos += c.duration_seconds ?? 0;
      actual.conTiempo += 1;
    }
    mapa.set(id, actual);
  }

  return [...mapa.values()]
    .map((i) => ({
      ...i,
      promedio: i.conTiempo > 0 ? i.segundos / i.conTiempo : 0,
    }))
    .sort((a, b) => b.hechas - a.hechas);
}

function formatoDuracion(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
