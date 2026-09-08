"use client";

import { Camera, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  abrirCamara,
  capturarDeVideo,
  explicarErrorCamara,
  formatearCoordenadas,
  formatearMomento,
  type FotoCapturada,
} from "@/lib/media/camara";

/**
 * Cámara a pantalla completa.
 *
 * Ocupa todo y sin distracciones: el inspector está apuntando a un punto
 * concreto de un tractor, no navegando una app. Se ve qué punto toca, la
 * imagen en vivo con los metadatos que van a quedar impresos, y un obturador
 * grande.
 *
 * El obturador mide 76px y va centrado abajo, a propósito: es el objetivo de
 * un pulgar que sostiene el teléfono con una mano, a veces con guante.
 */
export function CamaraPantallaCompleta({
  puntoNombre,
  latitud,
  longitud,
  onCapturar,
  onCerrar,
}: {
  puntoNombre: string;
  latitud: number | null;
  longitud: number | null;
  onCapturar: (foto: FotoCapturada, capturadaEn: string) => void;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado, setEstado] = useState<"abriendo" | "lista" | "error">("abriendo");
  const [error, setError] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date().toISOString());

  // El reloj de la vista previa avanza para que lo que se ve sea lo que se
  // va a quemar, no una hora congelada de cuando se abrió la cámara.
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date().toISOString()), 1000);
    return () => clearInterval(t);
  }, []);

  const cerrarStream = useCallback(() => {
    // Sin detener cada pista, la luz de la cámara se queda encendida y el
    // dispositivo sigue ocupado: la siguiente pantalla no puede abrirla.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const stream = await abrirCamara();

        // Si el componente se desmontó mientras el usuario decidía el
        // permiso, hay que soltar el stream o queda huérfano y encendido.
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
      cerrarStream();
    };
  }, [cerrarStream]);

  async function disparar() {
    if (!videoRef.current || capturando) return;

    setCapturando(true);
    const capturadaEn = new Date().toISOString();

    try {
      const foto = await capturarDeVideo(
        videoRef.current,
        { capturadaEn, latitud, longitud },
        puntoNombre
      );

      // Vibración corta como acuse. En un patio ruidoso y con guantes es la
      // única confirmación que se percibe de verdad.
      navigator.vibrate?.(40);

      onCapturar(foto, capturadaEn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo tomar la foto.");
    } finally {
      setCapturando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-gutter pt-safe">
        <div className="flex min-h-14 flex-1 items-center">
          <p className="truncate text-base font-semibold text-white">
            {puntoNombre}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar cámara"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-white/90 active:bg-white/10"
        >
          <X className="size-7" aria-hidden />
        </button>
      </div>

      {/* ── Visor ──────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          // playsInline es obligatorio en iOS: sin él, Safari abre el video a
          // pantalla completa en su propio reproductor y tapa la interfaz.
          className="size-full object-contain"
        />

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

        {/* Vista previa de lo que se va a quemar en la imagen. Coincide con
            lo que dibuja `capturarDeVideo`, para que no haya sorpresas. */}
        {estado === "lista" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-4 py-3">
            <p className="text-sm font-semibold leading-snug text-white">
              {puntoNombre}
            </p>
            <p className="font-mono text-xs leading-snug text-white/90">
              {formatearMomento(ahora)}
            </p>
            <p className="font-mono text-xs leading-snug text-white/90">
              {formatearCoordenadas(latitud, longitud)}
            </p>
          </div>
        )}
      </div>

      {/* ── Obturador ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-gutter pb-safe pt-5">
        <div className="flex h-28 items-center justify-center">
          <button
            type="button"
            onClick={disparar}
            disabled={estado !== "lista" || capturando}
            aria-label={`Tomar foto de ${puntoNombre}`}
            className="flex size-[76px] items-center justify-center rounded-full border-4 border-white bg-white/25 transition-transform active:scale-90 disabled:opacity-40"
          >
            {capturando ? (
              <LoaderCircle className="size-8 animate-spin text-white" aria-hidden />
            ) : (
              <span className="size-[58px] rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { Camera as IconoCamara };
