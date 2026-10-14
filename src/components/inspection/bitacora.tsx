import { Camera, Crown, ScrollText } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { Cambio } from "@/lib/inspection/autoria";
import {
  describir,
  leerCambios,
  leerResumen,
  lineasResultadoIa,
} from "@/lib/inspection/bitacora";
import { leerEventosBitacora } from "@/lib/inspection/eventos-bitacora";
import { formatoEnZona } from "@/lib/zona";
import { zonaDelUsuario } from "@/lib/zona-servidor";

/** Una línea por cambio: qué valía, qué vale y de quién era. */
function LineaCambio({ cambio }: { cambio: Cambio }) {
  if (cambio.tipo === "campo") {
    return (
      <li>
        <span className="font-medium text-ink">{cambio.campo}:</span> {cambio.antes} →{" "}
        <span className="font-medium text-ink">{cambio.despues}</span>
      </li>
    );
  }
  return (
    <li>
      <span className="font-medium text-ink">{cambio.nombre}:</span>{" "}
      {cambio.antes ? (
        <>
          {cambio.antes} → <span className="font-medium text-ink">{cambio.despues}</span>
        </>
      ) : (
        <span className="font-medium text-ink">{cambio.despues}</span>
      )}
      {cambio.foto && (
        <span className="ml-1 inline-flex items-center gap-1 text-ink-muted">
          · <Camera className="size-3" aria-hidden /> foto nueva
        </span>
      )}
      {cambio.antesPor && (
        <span className="text-warn-700 dark:text-warn-500"> · antes de {cambio.antesPor}</span>
      )}
      {cambio.nota && <span className="block text-ink-muted">“{cambio.nota}”</span>}
    </li>
  );
}

/**
 * Bitácora de la inspección.
 *
 * Append-only: dice quién hizo qué y cuándo, y en cada edición qué cambió y
 * de quién era lo anterior. El documento completo, con el resultado de la IA
 * foto por foto, vive en su propia página.
 */
export async function Bitacora({ inspeccionId }: { inspeccionId: string }) {
  const tz = await zonaDelUsuario();
  const { eventos, nombre } = await leerEventosBitacora(inspeccionId);
  if (eventos.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <ScrollText className="size-5 text-ink-muted" aria-hidden />
          Bitácora
        </h2>
        <Link
          href={`/inspeccion/${inspeccionId}/bitacora`}
          className="text-sm font-semibold text-brand-600"
        >
          Abrir documento
        </Link>
      </div>
      <Card className="overflow-hidden">
        <ol className="divide-y divide-line">
          {eventos.map((e) => {
            const cambios = leerCambios(e.payload);
            const resumen = leerResumen(e.payload);
            const lineasIa = lineasResultadoIa(e.event, e.payload);
            const esEdicion = Boolean(e.payload.edicion) && !e.payload.sinCambios;
            return (
              <li key={e.id} className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {e.event === "lead_claimed" && (
                    <Crown className="size-4 shrink-0 text-brand-600" aria-hidden />
                  )}
                  <span className={esEdicion ? "text-warn-700 dark:text-warn-500" : undefined}>
                    {describir(e.event, e.payload, nombre)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  <span className="font-semibold text-ink-secondary">{e.actor}</span>
                  {" · "}
                  {formatoEnZona(e.occurredAt, "d MMM yyyy, HH:mm:ss", tz)}
                </p>
                {resumen && (
                  <p className="mt-1 text-xs text-ink-secondary">Puntos: {resumen}</p>
                )}
                {cambios.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-line pl-3 text-xs text-ink-secondary">
                    {cambios.map((c, i) => (
                      <LineaCambio key={i} cambio={c} />
                    ))}
                  </ul>
                )}
                {lineasIa.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-line pl-3 text-xs text-ink-secondary">
                    {lineasIa.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
