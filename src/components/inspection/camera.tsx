"use client";

import { Camera, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  abrirCamara,
  capturarDeArchivo,
  capturarDeVideo,
  explicarErrorCamara,
  formatearCoordenadas,
  formatearMomento,
  type FotoCapturada,
} from "@/lib/media/camara";

/**
 * Cámara a pantalla completa, con respaldo nativo del teléfono.
 *
 * El visor en vivo es lo ideal, pero getUserMedia falla seguido: permiso,
 * HTTP, laptop sin webcam, iOS caprichoso. En esos casos el inspector tiene
 * que poder tomar la foto igual — el input `capture` abre la cámara del
 * sistema, que sí funciona.
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
  onCapturar: (foto: FotoCapturada, capturadaEn: string) => void | Promise<void>;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const archivoCamaraRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado, setEstado] = useState<"abriendo" | "lista" | "error">("abriendo");
  const [error, setError] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date().toISOString());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date().toISOString()), 1000);
    return () => clearInterval(t);
  }, []);

  const cerrarStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const intentarAbrir = useCallback(async () => {
    setEstado("abriendo");
    setError(null);
    try {
      const stream = await abrirCamara();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setEstado("lista");
    } catch (e) {
      cerrarStream();
      setError(explicarErrorCamara(e));
      setEstado("error");
    }
  }, [cerrarStream]);

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
        const video = videoRef.current;
        if (video) {
          video.muted = true;
          video.srcObject = stream;
          await video.play().catch(() => {});
          if (video.videoWidth === 0) {
            await new Promise<void>((resolve) => {
              const listo = () => resolve();
              video.addEventListener("loadeddata", listo, { once: true });
              window.setTimeout(listo, 2500);
            });
          }
        }
        if (!video?.videoWidth) {
          throw new Error("La cámara no entregó imagen. Usa los botones de abajo.");
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

  async function entregar(foto: FotoCapturada, capturadaEn: string) {
    navigator.vibrate?.(40);
    await onCapturar(foto, capturadaEn);
  }

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
      await entregar(foto, capturadaEn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo tomar la foto.");
    } finally {
      setCapturando(false);
    }
  }

  async function desdeArchivo(archivo: File) {
    setCapturando(true);
    const capturadaEn = new Date().toISOString();
    try {
      const foto = await capturarDeArchivo(
        archivo,
        { capturadaEn, latitud, longitud },
        puntoNombre
      );
      await entregar(foto, capturadaEn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo usar esa imagen.");
      setCapturando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <input
        ref={archivoCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="absolute h-px w-px opacity-0"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (!archivo) return;
          void desdeArchivo(archivo).finally(() => {
            e.target.value = "";
          });
        }}
      />
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

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="size-full object-contain"
        />

        {estado === "abriendo" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <LoaderCircle className="size-8 animate-spin" aria-hidden />
            <p>Abriendo la cámara…</p>
          </div>
        )}

        {estado === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
            <TriangleAlert className="size-10 text-warn-500" aria-hidden />
            <p className="text-lg font-semibold">No se pudo abrir la cámara en vivo</p>
            <p className="text-white/80">{error}</p>
            <p className="text-sm text-white/70">
              Usa el botón de abajo: abre la cámara del teléfono igual.
            </p>
            <Button variant="secondary" onClick={() => void intentarAbrir()}>
              Reintentar visor
            </Button>
          </div>
        )}

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

      <div className="flex flex-col items-center gap-3 px-gutter pb-safe pt-5">
        {error && estado === "lista" && (
          <p className="text-center text-sm text-warn-400">{error}</p>
        )}

        <div className="flex h-28 w-full items-center justify-center">
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

        {estado === "error" && (
          <div className="flex w-full flex-col gap-2">
            <Button
              size="lg"
              block
              onClick={() => archivoCamaraRef.current?.click()}
              disabled={capturando}
              loading={capturando}
            >
              {!capturando && <Camera className="size-5" aria-hidden />}
              Tomar foto con la cámara
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { Camera as IconoCamara };
