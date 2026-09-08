"use client";

import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Lienzo de firma.
 *
 * Usa eventos de puntero, no de ratón ni táctiles por separado: `pointer*`
 * cubre dedo, stylus y ratón con un solo camino de código. Con eventos
 * táctiles habría que duplicar todo y las dos ramas terminan divergiendo.
 *
 * `touch-none` es imprescindible: sin él, arrastrar el dedo para firmar
 * hace scroll de la página y la firma sale en pedazos.
 */
export function SignaturePad({
  valor,
  onChange,
  etiqueta,
}: {
  valor: string | null;
  onChange: (dataUrl: string | null) => void;
  etiqueta: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const hayTrazo = useRef(Boolean(valor));
  const [vacio, setVacio] = useState(!valor);

  /** Ajusta el lienzo a su tamaño real en pantalla y a la densidad de píxeles. */
  const preparar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Sin escalar por devicePixelRatio la firma se ve pixelada en cualquier
    // teléfono moderno, que va de 2x para arriba.
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    // Restaurar una firma previa al volver a la pantalla.
    if (valor) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = valor;
    }
  }, [valor]);

  useEffect(() => {
    preparar();

    // Rotar el teléfono cambia el ancho del lienzo. Sin volver a preparar,
    // el trazo queda desalineado del dedo.
    const obs = new ResizeObserver(() => preparar());
    if (canvasRef.current) obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [preparar]);

  function posicion(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Capturar el puntero: si el dedo se sale del lienzo a media firma, los
    // eventos siguen llegando y el trazo no se corta.
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;

    const { x, y } = posicion(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const { x, y } = posicion(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hayTrazo.current) {
      hayTrazo.current = true;
      setVacio(false);
    }
  }

  function terminar() {
    if (!dibujando.current) return;
    dibujando.current = false;

    const canvas = canvasRef.current;
    if (canvas && hayTrazo.current) onChange(canvas.toDataURL("image/png"));
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hayTrazo.current = false;
    setVacio(true);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-secondary">{etiqueta}</span>
        {!vacio && (
          <button
            type="button"
            onClick={limpiar}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-muted"
          >
            <Eraser className="size-4" aria-hidden />
            Borrar
          </button>
        )}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 bg-white",
          vacio ? "border-dashed border-line-strong" : "border-brand-600"
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          // touch-none: sin esto, firmar hace scroll de la página.
          className="h-44 w-full touch-none"
          aria-label={`Área para firmar: ${etiqueta}`}
          role="img"
        />

        {vacio && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Firma aquí con el dedo
          </p>
        )}
      </div>
    </div>
  );
}
