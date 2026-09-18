import { ArrowLeft, FileText, Images, PauseCircle, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ControlesPausa } from "@/components/inspection/pause-controls";
import { PhaseList } from "@/components/inspection/phase-list";
import { ProgressBar } from "@/components/inspection/progress-bar";
import { StatusBadge } from "@/components/inspection/status-badge";
import { Bitacora } from "@/components/inspection/bitacora";
import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import { construirFlujo } from "@/lib/inspection/flujo";
import { leerProgreso } from "@/lib/inspection/progreso";
import { capacidadesDe } from "@/lib/inspection/transporte";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InspeccionPage({
  params,
}: PageProps<"/inspeccion/[id]">) {
  const { id } = await params;
  await requerirSesion();

  const supabase = await createClient();

  // RLS decide si este usuario puede verla. Si no puede, `data` viene null y
  // sale un 404 — que es lo correcto: un 403 confirmaría que la inspección
  // existe, y eso ya es información que no le toca.
  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, display_id, status, customer_name, driver_name, tractor_number, transport_type, is_full, progress")
    .eq("id", id)
    .maybeSingle();

  if (!inspeccion) notFound();

  const progreso = leerProgreso(inspeccion.progress);
  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: progreso.completados,
  });

  const capacidades = capacidadesDe(inspeccion.transport_type);
  const cerrada =
    inspeccion.status === "completed" || inspeccion.status === "cancelled";

  return (
    <>
      {/* Encabezado propio, con botón de regreso: dentro de una inspección el
          contexto importa más que el saludo del inicio. */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-gutter">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-mono text-base font-bold leading-tight text-ink">
              {inspeccion.display_id}
            </h1>
            <p className="truncate text-xs leading-tight text-ink-muted">
              {inspeccion.customer_name ?? "Sin transportista"}
            </p>
          </div>
          <StatusBadge estado={inspeccion.status} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-gutter pb-28 pt-4 lg:pb-10">
        {/* ── Resumen ──────────────────────────────────────────────────── */}
        <Card className="p-4">
          <ProgressBar
            completados={flujo.completados}
            total={flujo.totalPasos}
          />

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-ink-muted">Transporte</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {capacidades?.nombre ?? "Sin definir"}
                {inspeccion.is_full && capacidades?.admiteFull && " · Full"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Tractor</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {inspeccion.tractor_number ?? "—"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-muted">Conductor</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {inspeccion.driver_name ?? "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {!cerrada && (
          <ControlesPausa
            inspeccionId={inspeccion.id}
            estado={inspeccion.status}
            puedePausar={flujo.puedePausar}
            criticosPendientes={flujo.criticosPendientes.length}
          />
        )}

        {/* ── Aviso de secciones críticas ──────────────────────────────── */}
        {!flujo.navegacionLibre && !cerrada && (
          <Card className="mt-4 flex items-start gap-3 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
            <PauseCircle
              className="mt-0.5 size-5 shrink-0 text-warn-600"
              aria-hidden
            />
            <div>
              <p className="font-semibold text-ink">Flujo guiado</p>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Faltan {flujo.criticosPendientes.length}{" "}
                {flujo.criticosPendientes.length === 1
                  ? "sección obligatoria"
                  : "secciones obligatorias"}
                . Hasta terminarlas no se puede pausar ni saltar entre
                pantallas: de ellas depende qué se inspecciona.
              </p>
            </div>
          </Card>
        )}

        {/* Con la inspección cerrada, el reporte es lo que la gente viene a
            buscar: va arriba de la lista de fases, no al final. */}
        {cerrada && (
          <Link href={`/inspeccion/${inspeccion.id}/reporte`} className="mt-4 block">
            <Card
              interactive
              className="flex items-center gap-3 p-4 hover:border-line-strong"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
                <FileText className="size-5 text-brand-600" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Ver reporte</span>
                <span className="block text-sm text-ink-secondary">
                  Expediente completo, listo para imprimir o guardar en PDF
                </span>
              </span>
            </Card>
          </Link>
        )}

        {/* Acceso a la galería. Aparece siempre: revisar la evidencia es útil
            tanto a media captura como en un expediente ya cerrado. */}
        <Link href={`/inspeccion/${inspeccion.id}/evidencia`} className="mt-4 block">
          <Card
            interactive
            className="flex items-center gap-3 p-4 hover:border-line-strong"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken">
              <Images className="size-5 text-ink-secondary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">Ver evidencia</span>
              <span className="block text-sm text-ink-secondary">
                Todas las fotos y clips de esta inspección
              </span>
            </span>
          </Card>
        </Link>

        <div className="mt-7">
          <PhaseList flujo={flujo} inspeccionId={inspeccion.id} />
        </div>

        <Bitacora inspeccionId={inspeccion.id} />
      </main>

      {/* ── Acción principal, fija abajo ─────────────────────────────────
          Al alcance del pulgar y siempre visible: el inspector no debería
          tener que buscar dónde seguir después de cada pantalla.          */}
      {flujo.siguiente && !cerrada && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 px-gutter pb-safe pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl pb-3">
            <Link
              href={`/inspeccion/${inspeccion.id}/${flujo.siguiente.clave}`}
              className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-600 px-6 text-lg font-semibold text-white shadow-sm transition-transform active:scale-[0.98] hover:bg-brand-700"
            >
              <Play className="size-5 shrink-0" aria-hidden />
              {flujo.completados === 0
                ? "Comenzar inspección"
                : `Continuar · ${flujo.siguiente.titulo}`}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
