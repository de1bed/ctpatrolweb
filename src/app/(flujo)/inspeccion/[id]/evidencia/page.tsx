import { ArrowLeft, ImageOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import { construirFlujo } from "@/lib/inspection/flujo";
import { leerProgreso } from "@/lib/inspection/progreso";
import { createClient } from "@/lib/supabase/server";

import { Galeria, type ItemEvidencia } from "./galeria";

export const metadata: Metadata = { title: "Evidencia" };

/** Vigencia de los enlaces. Corta: son evidencia, no contenido público. */
const MINUTOS_ENLACE = 30;

/**
 * Galería de toda la evidencia de una inspección.
 *
 * Existe porque revisar 41 fotos punto por punto, entrando y saliendo de cada
 * fase, es impracticable. Aquí se ven todas juntas, agrupadas por fase, y se
 * detecta de un vistazo la que salió movida o mal encuadrada.
 */
export default async function EvidenciaPage({
  params,
}: PageProps<"/inspeccion/[id]/evidencia">) {
  const { id } = await params;
  await requerirSesion();
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, display_id, status, transport_type, is_full, progress")
    .eq("id", id)
    .maybeSingle();

  if (!inspeccion) notFound();

  const { data: media } = await supabase
    .from("inspection_media")
    .select("id, kind, phase, point_key, point_label, storage_path, captured_at, latitude, longitude, ai_analysis")
    .eq("inspection_id", id)
    .not("storage_path", "is", null)
    .order("phase")
    .order("sort_order");

  const evidencia = media ?? [];

  const rutas = evidencia.map((m) => m.storage_path!).filter(Boolean);
  const { data: firmados } = rutas.length
    ? await supabase.storage
        .from("inspection-media")
        .createSignedUrls(rutas, MINUTOS_ENLACE * 60)
    : { data: [] };

  const urlPorRuta = new Map<string, string>();
  for (const f of firmados ?? []) {
    if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
  }

  // Los títulos de fase salen del motor, no de la columna: así una fase
  // por unidad se lee "Sellos · Caja 2" y no "sellos~2".
  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: leerProgreso(inspeccion.progress).completados,
  });
  const tituloDePaso = new Map(flujo.pasos.map((p) => [p.clave, p.titulo]));

  const items: ItemEvidencia[] = evidencia
    .map((m) => ({
      id: m.id,
      tipo: m.kind === "video" ? ("video" as const) : ("foto" as const),
      paso: m.phase,
      pasoTitulo: tituloDePaso.get(m.phase) ?? m.phase,
      punto: m.point_label ?? m.point_key ?? "Sin punto",
      url: m.storage_path ? (urlPorRuta.get(m.storage_path) ?? null) : null,
      capturadaEn: m.captured_at,
      latitud: m.latitude,
      longitud: m.longitude,
      tieneAnalisis: Boolean(m.ai_analysis),
    }))
    .filter((i) => i.url !== null);

  const abierta =
    inspeccion.status !== "completed" && inspeccion.status !== "cancelled";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-gutter">
          <Link
            href={`/inspeccion/${id}`}
            aria-label="Volver a la inspección"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold leading-tight text-ink">Evidencia</h1>
            <p className="truncate font-mono text-xs leading-tight text-ink-muted">
              {inspeccion.display_id}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5">
        {items.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ImageOff className="size-10 text-ink-muted/50" aria-hidden />
            <p className="font-medium text-ink">Sin evidencia todavía</p>
            <p className="max-w-xs text-sm text-ink-secondary">
              Las fotos aparecen aquí conforme se van subiendo. Si acabas de
              capturarlas, dale un momento a la sincronización.
            </p>
          </Card>
        ) : (
          <Galeria items={items} inspeccionId={id} permitirRehacer={abierta} />
        )}
      </main>
    </>
  );
}
