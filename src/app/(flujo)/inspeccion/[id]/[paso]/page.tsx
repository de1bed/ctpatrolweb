import { notFound, redirect } from "next/navigation";

import { FaseConfiguracion } from "@/components/inspection/fases/configuracion";
import {
  FaseCliente,
  FaseConductor,
  FasePlacasRemolque,
  FaseTractor,
} from "@/components/inspection/fases/catalogo";
import {
  FaseFirmas,
  FasePausa,
  FaseSellos,
} from "@/components/inspection/fases/cierre";
import {
  FaseEstadoEntrada,
  FaseEstadoSalida,
  FaseMovimiento,
  FaseTamano,
} from "@/components/inspection/fases/opciones-simples";
import { FaseRevision, type ResumenPaso } from "@/components/inspection/fases/revision";
import {
  FaseAgricola,
  FaseComentarios,
  FaseDocumentos,
  FaseTemperaturas,
} from "@/components/inspection/fases/texto-libre";
import { FaseTipoTransporte } from "@/components/inspection/fases/tipo-transporte";
import { FaseVisual } from "@/components/inspection/fases/visual";
import { obtenerPermisos, requerirSesion } from "@/lib/auth";
import type { FaseId } from "@/lib/inspection/fases";
import { construirFlujo, puedeAbrir } from "@/lib/inspection/flujo";
import { leerProgreso } from "@/lib/inspection/progreso";
import type { GrupoPuntos } from "@/lib/inspection/puntos";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Pantalla de una fase.
 *
 * Aquí se resuelve todo lo que la pantalla no debería tener que resolver:
 * cargar la inspección, verificar que la fase aplica y que le toca abrirla,
 * y elegir el componente. Cada pantalla recibe sus datos ya listos.
 *
 * El chequeo de acceso se hace ANTES de renderizar. Confiar en que el índice
 * solo muestra enlaces válidos no basta: la URL se puede teclear a mano.
 */
export default async function PasoPage({
  params,
}: PageProps<"/inspeccion/[id]/[paso]">) {
  const { id, paso: clavePaso } = await params;
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, status, transport_type, is_full, latitude, longitude, data, progress")
    .eq("id", id)
    .maybeSingle();

  if (!inspeccion) notFound();

  // Una inspección cerrada se consulta desde el expediente, no se reabre por
  // URL. Se manda al índice, que ya la muestra en modo lectura.
  if (inspeccion.status === "completed" || inspeccion.status === "cancelled") {
    redirect(`/inspeccion/${id}`);
  }

  const progreso = leerProgreso(inspeccion.progress);
  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: progreso.completados,
  });

  const paso = flujo.pasos.find((p) => p.clave === clavePaso);

  // No existe en este flujo: o la clave está mal escrita, o es una fase que
  // no aplica a este tipo de transporte.
  if (!paso) redirect(`/inspeccion/${id}`);

  if (!puedeAbrir(flujo, clavePaso)) redirect(`/inspeccion/${id}`);

  const datos =
    inspeccion.data && typeof inspeccion.data === "object" && !Array.isArray(inspeccion.data)
      ? (inspeccion.data as Record<string, unknown>)
      : {};

  const datosPrevios =
    (datos[clavePaso] as Record<string, unknown> | undefined) ?? null;

  const indice = flujo.pasos.findIndex((p) => p.clave === clavePaso) + 1;

  const base = {
    inspeccionId: id,
    clavePaso,
    titulo: paso.titulo,
    indice,
    total: flujo.totalPasos,
    datosPrevios,
    contexto: {
      tipoTransporte: inspeccion.transport_type,
      esFull: inspeccion.is_full,
      nombreInspector: sesion.nombre,
      unidad: paso.unidad,
    },
  };

  const faseId = paso.fase.id as FaseId;

  switch (faseId) {
    case "configuracion":
      return <FaseConfiguracion {...base} />;

    case "tipo-transporte":
      return <FaseTipoTransporte {...base} />;

    case "tamano":
      return <FaseTamano {...base} />;

    case "movimiento":
      return <FaseMovimiento {...base} />;

    case "estado-entrada":
      return <FaseEstadoEntrada {...base} />;

    case "estado-salida":
      return <FaseEstadoSalida {...base} />;

    case "temperaturas":
      return <FaseTemperaturas {...base} />;

    case "agricola":
      return <FaseAgricola {...base} />;

    case "comentarios":
      return <FaseComentarios {...base} />;

    case "pausa":
      return <FasePausa {...base} />;

    case "sellos":
      return (
        <FaseSellos
          {...base}
          latitud={inspeccion.latitude}
          longitud={inspeccion.longitude}
        />
      );

    case "firmas":
      return <FaseFirmas {...base} />;

    // ── Fases con permisos de catálogo ────────────────────────────────────
    case "cliente":
    case "conductor":
    case "tractor":
    case "placas-remolque": {
      const permisos = await obtenerPermisos(sesion);
      const conPermisos = { ...base, permisos };

      if (faseId === "cliente") return <FaseCliente {...conPermisos} />;
      if (faseId === "conductor") return <FaseConductor {...conPermisos} />;
      if (faseId === "tractor") return <FaseTractor {...conPermisos} />;
      return <FasePlacasRemolque {...conPermisos} />;
    }

    // ── Documentos: puede venir precargado desde el panel ─────────────────
    case "documentos": {
      const permisos = await obtenerPermisos(sesion);
      return (
        <FaseDocumentos {...base} soloLectura={!permisos.puedeEditarDocumentos} />
      );
    }

    // ── Fases de inspección visual ────────────────────────────────────────
    case "tractor-visual":
    case "inspeccion-interna":
    case "inspeccion-externa": {
      // Evidencia ya subida de este paso. Se necesita para poder analizarla
      // con IA: el servidor lee la foto de Storage, y mientras solo exista en
      // el dispositivo no hay nada que leer.
      const { data: media } = await supabase
        .from("inspection_media")
        .select("id, point_key, ai_analysis, storage_path")
        .eq("inspection_id", id)
        .eq("phase", clavePaso);

      const rutas = (media ?? [])
        .map((m) => m.storage_path)
        .filter((p): p is string => Boolean(p));
      const { data: firmados } = rutas.length
        ? await supabase.storage
            .from("inspection-media")
            .createSignedUrls(rutas, 60 * 60)
        : { data: [] };
      const urlPorRuta = new Map<string, string>();
      for (const f of firmados ?? []) {
        if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
      }

      const evidencia: Record<
        string,
        { id: string; analisis: unknown; url: string | null }
      > = {};
      for (const m of media ?? []) {
        if (!m.point_key) continue;
        evidencia[m.point_key] = {
          id: m.id,
          analisis: m.ai_analysis,
          url: m.storage_path ? (urlPorRuta.get(m.storage_path) ?? null) : null,
        };
      }

      const { data: cuentaIa } = await supabase
        .from("company_accounts")
        .select("ia_plataforma, ia_activa, creditos_ia")
        .eq("id", sesion.companyAccountId)
        .maybeSingle();
      const iaHabilitada = Boolean(
        cuentaIa?.ia_plataforma &&
          cuentaIa.ia_activa &&
          cuentaIa.creditos_ia > 0
      );

      return (
        <FaseVisual
          key={JSON.stringify(datosPrevios)}
          {...base}
          grupo={paso.fase.puntos as GrupoPuntos}
          latitud={inspeccion.latitude}
          longitud={inspeccion.longitude}
          evidenciaSubida={evidencia}
          puedeRechazar={sesion.esAdmin}
          iaHabilitada={iaHabilitada}
        />
      );
    }

    // ── Revisión: necesita el resumen de todo lo demás ────────────────────
    case "revision": {
      const { count } = await supabase
        .from("inspection_media")
        .select("id", { count: "exact", head: true })
        .eq("inspection_id", id)
        .not("storage_path", "is", null);

      const resumen: ResumenPaso[] = flujo.pasos
        .filter((p) => p.fase.id !== "revision")
        .map((p) => ({
          clave: p.clave,
          titulo: p.titulo,
          completado: p.completado,
          hallazgos: contarHallazgos(datos[p.clave]),
        }));

      return (
        <FaseRevision
          {...base}
          resumen={resumen}
          fotosServidor={count ?? 0}
        />
      );
    }
  }
}

/**
 * Cuenta los puntos calificados como "regular" o "malo".
 *
 * Se lee con cuidado porque `data` es JSONB: puede traer una forma vieja de
 * antes de un cambio de esquema, y un acceso optimista tumbaría la pantalla
 * de revisión justo cuando el inspector está por cerrar.
 */
function contarHallazgos(datosFase: unknown): number {
  if (!datosFase || typeof datosFase !== "object") return 0;

  const puntos = (datosFase as Record<string, unknown>).puntos;
  if (!puntos || typeof puntos !== "object") return 0;

  return Object.values(puntos as Record<string, unknown>).filter((p) => {
    if (!p || typeof p !== "object") return false;
    const calificacion = (p as Record<string, unknown>).calificacion;
    return calificacion === "regular" || calificacion === "malo";
  }).length;
}
