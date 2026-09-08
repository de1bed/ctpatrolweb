"use client";

import { AlertCircle, LoaderCircle, ScanLine, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { escanearDocumento } from "@/app/(flujo)/inspeccion/[id]/ocr-acciones";
import { Button } from "@/components/ui/button";
import { abrirCamara, explicarErrorCamara } from "@/lib/media/camara";
import type { Extraccion } from "@/lib/ai/ocr";

/**
 * Escáner de documentos.
 *
 * El inspector encuadra la factura o el pedimento y la app rellena los
 * campos. Teclear un pedimento de 15 dígitos con guantes, de pie y con el
 * conductor esperando es donde se cuelan los errores de captura.
 *
 * Lo que lee NO se acepta a ciegas: rellena los campos y el inspector los ve
 * y confirma. Los que el modelo marcó como dudosos salen resaltados.
 */
export function EscanerDocumentos({
  onExtraer,
  onCerrar,
}: {
  onExtraer: (datos: Extraccion) => void;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado, setEstado] = useState<"abriendo" | "lista" | "leyendo" | "error">(
    "abriendo"
  );
  const [error, setError] = useState<string | null>(null);

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
      cerrarStream();
    };
  }, [cerrarStream]);

  async function capturar() {
    const video = videoRef.current;
    if (!video || estado !== "lista") return;

    setEstado("leyendo");
    setError(null);

    try {
      // Resolución alta a propósito: aquí no se comprime como en la evidencia.
      // Los dígitos de un pedimento en letra chica desaparecen al reescalar,
      // y el modelo acaba adivinando.
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const base64 = dataUrl.split(",")[1];

      const r = await escanearDocumento({
        imagenBase64: base64,
        mimeType: "image/jpeg",
      });

      if (!r.ok) {
        setError(r.error);
        setEstado("lista");
        return;
      }

      if (r.datos.problema) {
        setError(r.datos.problema);
        setEstado("lista");
        return;
      }

      const encontrados = [
        r.datos.factura,
        r.datos.billOfLading,
        r.datos.pedimento,
        r.datos.sellosFiscales,
      ].filter(Boolean).length;

      if (encontrados === 0) {
        setError(
          "No se encontró ningún dato reconocible. Acerca más la cámara o mejora la luz."
        );
        setEstado("lista");
        return;
      }

      navigator.vibrate?.(40);
      onExtraer(r.datos);
    } catch {
      setError("No se pudo procesar la imagen.");
      setEstado("lista");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-gutter pt-safe">
        <div className="flex min-h-14 flex-1 flex-col justify-center">
          <p className="text-base font-semibold text-white">Escanear documento</p>
          <p className="text-xs text-white/70">
            Encuadra la hoja completa, con buena luz
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-white/90 active:bg-white/10"
        >
          <X className="size-7" aria-hidden />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="size-full object-contain" />

        {/* Guía de encuadre: sin ella el inspector no sabe qué tanto acercar,
            y la mitad de las fotos salen con la hoja cortada. */}
        {estado === "lista" && (
          <div
            className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/60"
            aria-hidden
          />
        )}

        {estado === "abriendo" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <LoaderCircle className="size-8 animate-spin" aria-hidden />
            <p>Abriendo la cámara…</p>
          </div>
        )}

        {estado === "leyendo" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <LoaderCircle className="size-8 animate-spin" aria-hidden />
            <p className="font-medium">Leyendo el documento…</p>
            <p className="text-sm text-white/70">Puede tardar unos segundos</p>
          </div>
        )}

        {estado === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <TriangleAlert className="size-10 text-warn-500" aria-hidden />
            <p className="text-lg font-semibold">No se pudo abrir la cámara</p>
            <p className="text-white/80">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-gutter pb-safe pt-4">
        {error && estado === "lista" && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-600/90 px-3.5 py-2.5 text-sm text-white"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="flex h-24 items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={capturar}
            disabled={estado !== "lista"}
            loading={estado === "leyendo"}
          >
            {estado !== "leyendo" && <ScanLine className="size-5" aria-hidden />}
            {estado === "leyendo" ? "Leyendo…" : "Escanear"}
          </Button>
        </div>

        <p className="pb-2 text-center text-xs text-white/60">
          La foto del documento no se guarda: solo se usa para leer los números.
        </p>
      </div>
    </div>
  );
}
