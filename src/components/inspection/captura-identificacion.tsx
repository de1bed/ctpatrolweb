"use client";

import { Camera, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { leerIdentificacion } from "@/app/(flujo)/inspeccion/[id]/identificacion-acciones";
import { CamaraPantallaCompleta } from "@/components/inspection/camera";
import { Button } from "@/components/ui/button";
import type { LecturaIdentificacion, TipoIdentificacion } from "@/lib/ai/identificacion";
import {
  borrarFoto,
  EVENTO_EVIDENCIA_SUBIDA,
  fotosDePaso,
  guardarFoto,
  type DetalleEvidenciaSubida,
  type FotoLocal,
} from "@/lib/media/almacen";
import type { FotoCapturada } from "@/lib/media/camara";
import { blobAJpegBase64 } from "@/lib/media/imagen";

/** Foto ya subida de este punto, firmada por el servidor. */
export type FotoServidor = { id: string; url: string };

/**
 * Foto de una identificación (licencia o placas) con lectura opcional por IA.
 *
 * Dos cosas independientes, a propósito:
 *
 *   Foto      Siempre disponible. Se toma SOLO con la cámara —nunca de la
 *             galería— para que no se pueda presentar una imagen vieja o
 *             ajena como evidencia. Se guarda en el teléfono al instante y
 *             se sube sola, igual que el resto de la evidencia.
 *
 *   Lectura   Solo si la empresa tiene IA encendida y con créditos, y solo
 *             cuando el inspector la pide. Sin IA la foto se guarda igual y
 *             los datos se capturan a mano.
 */
export function CapturaIdentificacion({
  inspeccionId,
  clavePaso,
  puntoClave,
  puntoNombre,
  etiquetaBoton,
  latitud,
  longitud,
  fotoServidor,
  tipoLectura,
  iaHabilitada,
  onLectura,
  onTieneFoto,
}: {
  inspeccionId: string;
  clavePaso: string;
  /** Identidad del punto dentro del paso. Una foto vigente por punto. */
  puntoClave: string;
  /** Lo que se imprime en la foto y en el reporte. */
  puntoNombre: string;
  etiquetaBoton: string;
  latitud: number | null;
  longitud: number | null;
  fotoServidor?: FotoServidor | null;
  tipoLectura: TipoIdentificacion;
  iaHabilitada: boolean;
  onLectura: (datos: LecturaIdentificacion) => void;
  /**
   * Avisa si el punto ya tiene foto, en el teléfono o en el servidor. La
   * fase lo usa para no dejar continuar sin ella. Cuenta la foto aún sin
   * subir: sin señal, la evidencia vive en el teléfono hasta que haya red.
   */
  onTieneFoto?: (tiene: boolean) => void;
}) {
  const [fotoLocal, setFotoLocal] = useState<FotoLocal | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // ── Foto que ya estaba en el teléfono ───────────────────────────────────
  useEffect(() => {
    let vivo = true;
    fotosDePaso(inspeccionId, clavePaso)
      .then((lista) => {
        if (!vivo) return;
        const ultima = lista
          .filter((f) => f.puntoClave === puntoClave && f.tipo !== "video")
          .sort((a, b) => b.capturadaEn.localeCompare(a.capturadaEn))[0];
        if (ultima) setFotoLocal(ultima);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [inspeccionId, clavePaso, puntoClave]);

  // El uploader escribe el mediaId en IndexedDB; el estado de React se
  // entera por este evento.
  useEffect(() => {
    function alSubir(e: Event) {
      const d = (e as CustomEvent<DetalleEvidenciaSubida>).detail;
      if (
        d.inspeccionId !== inspeccionId ||
        d.paso !== clavePaso ||
        d.puntoClave !== puntoClave
      ) {
        return;
      }
      setFotoLocal((actual) =>
        actual ? { ...actual, mediaId: d.mediaId, estado: "subida" } : actual
      );
    }
    window.addEventListener(EVENTO_EVIDENCIA_SUBIDA, alSubir);
    return () => window.removeEventListener(EVENTO_EVIDENCIA_SUBIDA, alSubir);
  }, [inspeccionId, clavePaso, puntoClave]);

  const urlLocal = useMemo(
    () =>
      fotoLocal?.blob && fotoLocal.blob.size > 0
        ? URL.createObjectURL(fotoLocal.blob)
        : null,
    [fotoLocal]
  );

  useEffect(() => {
    return () => {
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [urlLocal]);

  const url = urlLocal ?? fotoServidor?.url ?? null;
  const tieneFoto = Boolean(url);

  // La fase pasa una función nueva en cada render; con la ref el efecto
  // solo corre cuando cambia el dato, no cuando cambia la función.
  const avisar = useRef(onTieneFoto);
  useEffect(() => {
    avisar.current = onTieneFoto;
  });
  useEffect(() => {
    avisar.current?.(tieneFoto);
  }, [tieneFoto]);

  async function alCapturar(foto: FotoCapturada, capturadaEn: string) {
    setError(null);
    setAviso(null);
    try {
      // Volver a tomar reemplaza la copia del teléfono. La anterior, si ya se
      // subió, queda en el expediente; el reporte usa la más reciente.
      if (fotoLocal) await borrarFoto(fotoLocal.clientId);

      const guardada = await guardarFoto({
        clientId: crypto.randomUUID(),
        inspeccionId,
        paso: clavePaso,
        puntoClave,
        puntoNombre,
        blob: foto.blob,
        mimeType: foto.mimeType,
        ancho: foto.ancho,
        alto: foto.alto,
        capturadaEn,
        latitud,
        longitud,
      });
      setFotoLocal(guardada);
      setCamaraAbierta(false);
    } catch (e) {
      setCamaraAbierta(false);
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la foto en el dispositivo."
      );
    }
  }

  async function leer() {
    setLeyendo(true);
    setError(null);
    setAviso(null);
    try {
      let entrada: Record<string, unknown>;
      if (fotoLocal?.blob && fotoLocal.blob.size > 0) {
        entrada = {
          inspeccionId,
          tipo: tipoLectura,
          imagenBase64: await blobAJpegBase64(fotoLocal.blob),
          mimeType: "image/jpeg",
        };
      } else if (fotoServidor) {
        entrada = { inspeccionId, tipo: tipoLectura, mediaId: fotoServidor.id };
      } else {
        setError("Toma la foto primero.");
        return;
      }

      const r = await leerIdentificacion(entrada);
      if (!r.ok) {
        setError(`${r.error} Puedes capturar los datos a mano.`);
        return;
      }

      const encontrado = Boolean(r.datos.numero?.trim() || r.datos.nombre?.trim());
      if (!encontrado) {
        setError(
          r.datos.problema ??
            "No se encontró ningún dato legible. Toma la foto más cerca o captura a mano."
        );
        return;
      }

      navigator.vibrate?.(40);
      onLectura(r.datos);
      setAviso(
        r.datos.dudoso
          ? "La lectura no quedó segura de algunos caracteres. Compáralos con la foto."
          : "Datos leídos. Verifícalos antes de continuar."
      );
    } catch {
      setError("No se pudo procesar la imagen. Captura los datos a mano.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCamaraAbierta(true)}
          aria-label={url ? `Volver a tomar: ${puntoNombre}` : etiquetaBoton}
          className={
            url
              ? "relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ok-600 transition-transform active:scale-95"
              : "relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-surface-sunken transition-transform active:scale-95"
          }
        >
          {url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={puntoNombre} className="size-full object-cover" />
              <span className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-tl-lg bg-ok-600 text-white">
                <RotateCcw className="size-3.5" aria-hidden />
              </span>
            </>
          ) : (
            <Camera className="size-7 text-brand-600" aria-hidden />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-medium text-ink">{puntoNombre}</p>
          {url ? (
            iaHabilitada ? (
              <Button
                size="sm"
                variant="secondary"
                loading={leyendo}
                onClick={() => void leer()}
                className="self-start"
              >
                {!leyendo && <Sparkles className="size-4" aria-hidden />}
                {leyendo ? "Leyendo…" : "Extraer datos con IA"}
              </Button>
            ) : (
              <p className="text-xs text-ink-muted">
                Foto guardada como evidencia. Captura los datos a mano.
              </p>
            )
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCamaraAbierta(true)}
              className="self-start"
            >
              <Camera className="size-4" aria-hidden />
              {etiquetaBoton}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger-600">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {aviso && !error && (
        <p className="flex items-start gap-2 text-sm text-ink-secondary">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-600" aria-hidden />
          {aviso}
        </p>
      )}

      {camaraAbierta && (
        <CamaraPantallaCompleta
          puntoNombre={puntoNombre}
          latitud={latitud}
          longitud={longitud}
          onCapturar={alCapturar}
          onCerrar={() => setCamaraAbierta(false)}
        />
      )}
    </div>
  );
}
