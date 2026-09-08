"use client";

import { LoaderCircle, Square, TriangleAlert, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { abrirCamara, explicarErrorCamara, formatearMomento } from "@/lib/media/camara";
import {
  DURACION_MAXIMA,
  DURACION_MINIMA,
  grabar,
  type ControlGrabacion,
  type VideoCapturado,
} from "@/lib/media/video";

/**
 * Grabadora de clip de sello.
 *
 * La cuenta regresiva es la pieza importante de la interfaz: el inspector
 * tiene entre 4 y 8 segundos para jalar y girar, y necesita saber cuándo
 * puede soltar. Sin el contador acabaría grabando dos segundos o veinte.
 */
export function GrabadoraVideo({
  selloNumero,
  latitud,
  longitud,
  onCapturar,
  onCerrar,
}: {
  selloNumero: string;
  latitud: number | null;
  longitud: number | null;
  onCapturar: (video: VideoCapturado, capturadoEn: string) => void;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const grabacionRef = useRef<ControlGrabacion | null>(null);

  const [estado, setEstado] = useState<"abriendo" | "lista" | "grabando" | "error">(
    "abriendo"
  );
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);

  const cerrarStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const stream = await abrirCamara();
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setEstado("lista");
      } catch (e) {
        if (!cancelado) {
          setError(explicarErrorCamara(e));
          setEstado("error");
        }
      }
    })();

    return () => {
      cancelado = true;
      grabacionRef.current?.cancelar();
      cerrarStream();
    };
  }, [cerrarStream]);

  const detener = useCallback(async () => {
    const control = grabacionRef.current;
    if (!control) return;

    grabacionRef.current = null;
    try {
      const video = await control.detener();
      navigator.vibrate?.(40);
      onCapturar(video, new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el clip.");
      setEstado("lista");
    }
  }, [onCapturar]);

  // Contador y corte automático al llegar al máximo.
  useEffect(() => {
    if (estado !== "grabando") return;

    const t = setInterval(() => {
      setSegundos((s) => {
        const siguiente = s + 0.1;
        if (siguiente >= DURACION_MAXIMA) {
          // Corte automático: pasarse del máximo genera archivos grandes sin
          // aportar evidencia adicional.
          void detener();
          return DURACION_MAXIMA;
        }
        return siguiente;
      });
    }, 100);

    return () => clearInterval(t);
  }, [estado, detener]);

  function empezar() {
    if (!streamRef.current) return;
    setError(null);
    setSegundos(0);
    grabacionRef.current = grabar(streamRef.current);
    setEstado("grabando");
  }

  const suficiente = segundos >= DURACION_MINIMA;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-gutter pt-safe">
        <div className="flex min-h-14 flex-1 flex-col justify-center">
          <p className="truncate text-base font-semibold text-white">
            Sello {selloNumero || "sin número"}
          </p>
          <p className="text-xs text-white/70">Jala y gira el sello mientras grabas</p>
        </div>
        {estado !== "grabando" && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-white/90 active:bg-white/10"
          >
            <X className="size-7" aria-hidden />
          </button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="size-full object-contain" />

        {estado === "abriendo" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <LoaderCircle className="size-8 animate-spin" aria-hidden />
            <p>Abriendo la cámara…</p>
          </div>
        )}

        {estado === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <TriangleAlert className="size-10 text-warn-500" aria-hidden />
            <p className="text-lg font-semibold">No se pudo abrir la cámara</p>
            <p className="text-white/80">{error}</p>
          </div>
        )}

        {estado === "grabando" && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
            <span className="flex items-center gap-2 rounded-full bg-danger-600 px-3.5 py-1.5 text-sm font-bold text-white">
              <span className="size-2.5 animate-pulse rounded-full bg-white" />
              {segundos.toFixed(1)}s
            </span>
          </div>
        )}

        {estado !== "abriendo" && estado !== "error" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-4 py-2">
            <p className="font-mono text-xs text-white/90">
              {formatearMomento(new Date().toISOString())}
              {latitud != null &&
                longitud != null &&
                ` · ${latitud.toFixed(5)}, ${longitud.toFixed(5)}`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-gutter pb-safe pt-4">
        {estado === "grabando" && (
          <p
            className={cn(
              "text-sm font-medium",
              suficiente ? "text-ok-500" : "text-white/70"
            )}
          >
            {suficiente
              ? "Ya puedes detener"
              : `Mínimo ${DURACION_MINIMA} segundos`}
          </p>
        )}

        <div className="flex h-24 items-center justify-center">
          {estado === "grabando" ? (
            <button
              type="button"
              onClick={() => void detener()}
              disabled={!suficiente}
              aria-label="Detener grabación"
              className="flex size-[76px] items-center justify-center rounded-full border-4 border-white bg-danger-600 transition-transform active:scale-90 disabled:opacity-40"
            >
              <Square className="size-8 fill-white text-white" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={empezar}
              disabled={estado !== "lista"}
              aria-label="Empezar a grabar"
              className="flex size-[76px] items-center justify-center rounded-full border-4 border-white bg-white/25 transition-transform active:scale-90 disabled:opacity-40"
            >
              <Video className="size-9 text-white" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
