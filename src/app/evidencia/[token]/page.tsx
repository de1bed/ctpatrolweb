import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { CAPACIDADES, type TipoTransporte } from "@/lib/inspection/transporte";

export const metadata: Metadata = {
  title: "Verificación de inspección",
  robots: { index: false, follow: false },
};

/**
 * Verificación pública de una inspección.
 *
 * Se abre escaneando el QR del reporte impreso. Es la única página de la app
 * SIN sesión, y por eso muestra deliberadamente poco: confirma que el folio
 * existe, de quién es, cuándo se hizo y cómo salió. Nada más.
 *
 * No hay fotos, ni documentos, ni conductor, ni detalle de hallazgos. Quien
 * tiene el enlace tiene el papel en la mano; lo que necesita es saber si ese
 * papel corresponde a algo real, no ver el expediente completo.
 *
 * La consulta va por una función SECURITY DEFINER que solo devuelve esos
 * campos: aunque alguien manipulara la petición, no hay más que sacar.
 */
export default async function VerificacionPage({
  params,
}: PageProps<"/evidencia/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("verificar_inspeccion", { token });
  const inspeccion = Array.isArray(data) ? data[0] : null;

  return (
    <main className="flex min-h-screen-safe flex-col items-center justify-center bg-surface-sunken px-gutter py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/icons/icon-256.png"
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-2xl"
            priority
          />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
            Verificación de inspección
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            CTPatrol · Inspecciones de seguridad C-TPAT
          </p>
        </div>

        {!inspeccion ? (
          /* Un token inválido y uno revocado dan la MISMA respuesta: decir
             "existía pero fue revocado" ya sería confirmar que ese folio es
             real, y eso es información que no le toca a quien está tanteando. */
          <div className="rounded-2xl border border-danger-500/40 bg-danger-50 p-6 text-center dark:bg-danger-500/10">
            <ShieldX
              className="mx-auto size-12 text-danger-600"
              aria-hidden
            />
            <p className="mt-3 text-lg font-bold text-ink">
              No se encontró esta inspección
            </p>
            <p className="mt-1.5 text-sm text-ink-secondary">
              El código no corresponde a ninguna inspección válida. Verifica que
              hayas escaneado bien el QR del documento original.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <div
              className={
                inspeccion.resultado === "aprobada"
                  ? "flex items-center gap-3 bg-ok-600 px-5 py-4 text-white"
                  : "flex items-center gap-3 bg-danger-600 px-5 py-4 text-white"
              }
            >
              {inspeccion.resultado === "aprobada" ? (
                <ShieldCheck className="size-8 shrink-0" aria-hidden />
              ) : (
                <ShieldAlert className="size-8 shrink-0" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">
                  Inspección {inspeccion.resultado === "aprobada" ? "aprobada" : "rechazada"}
                </p>
                <p className="font-mono text-sm opacity-90">{inspeccion.folio}</p>
              </div>
            </div>

            <dl className="divide-y divide-line">
              <Dato etiqueta="Empresa inspectora" valor={inspeccion.empresa} />
              <Dato
                etiqueta="Fecha de inspección"
                valor={
                  inspeccion.fecha_inspeccion
                    ? format(
                        new Date(inspeccion.fecha_inspeccion),
                        "d 'de' MMMM 'de' yyyy, HH:mm",
                        { locale: es }
                      )
                    : "—"
                }
              />
              <Dato
                etiqueta="Tipo de transporte"
                valor={
                  CAPACIDADES[inspeccion.tipo_transporte as TipoTransporte]?.nombre ??
                  inspeccion.tipo_transporte ??
                  "—"
                }
              />
              <Dato etiqueta="Unidad" valor={inspeccion.tractor ?? "—"} />
              <Dato
                etiqueta="Hallazgos registrados"
                valor={String(inspeccion.hallazgos ?? 0)}
              />
            </dl>

            <p className="border-t border-line bg-surface-sunken px-5 py-3 text-xs text-ink-muted">
              Esta página confirma la existencia y el resultado de la
              inspección. El expediente completo, con evidencia fotográfica,
              solo está disponible para personal autorizado.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
      <dt className="text-sm text-ink-muted">{etiqueta}</dt>
      <dd className="font-semibold text-ink">{valor}</dd>
    </div>
  );
}
