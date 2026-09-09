"use client";

import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { guardarFase } from "@/app/(flujo)/inspeccion/[id]/acciones";
import { cn } from "@/lib/cn";

/**
 * Armazón de una pantalla de fase.
 *
 * Todas las pantallas del flujo comparten esta estructura: encabezado con
 * regreso y avance, el contenido, y un botón fijo abajo. Que sean idénticas
 * no es pereza — es lo que hace que el inspector aprenda una sola vez dónde
 * está todo y luego avance sin pensar.
 *
 * El botón va fijo al fondo y no al final del scroll: en una pantalla larga
 * (los 19 puntos de la inspección externa) tener que llegar hasta abajo para
 * continuar es un viaje innecesario en cada fase.
 */
export function PantallaFase({
  inspeccionId,
  clavePaso,
  titulo,
  descripcion,
  indice,
  total,
  children,
  /** Junta los datos del formulario al momento de guardar. */
  recolectar,
  /** Bloquea el guardado con un motivo, cuando falta algo obligatorio. */
  faltante,
  etiquetaBoton = "Guardar y continuar",
}: {
  inspeccionId: string;
  clavePaso: string;
  titulo: string;
  descripcion?: string;
  indice: number;
  total: number;
  children: ReactNode;
  recolectar: () => unknown;
  faltante?: string | null;
  etiquetaBoton?: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cronómetro de la pantalla.
   *
   * Se pausa cuando la pestaña deja de estar visible: el inspector se sale a
   * contestar una llamada o a mirar la unidad, y contar ese rato como tiempo
   * de captura desvirtúa la métrica que el admin va a leer.
   */
  const acumulado = useRef(0);
  // Arranca en null y el reloj se echa a andar en el efecto. Llamar a
  // Date.now() durante el render es impuro: con Strict Mode o una
  // re-renderización el valor inicial cambiaría y el conteo saldría mal.
  const desde = useRef<number | null>(null);

  useEffect(() => {
    desde.current = Date.now();

    function alCambiarVisibilidad() {
      if (document.visibilityState === "hidden") {
        if (desde.current !== null) {
          acumulado.current += Date.now() - desde.current;
          desde.current = null;
        }
      } else {
        desde.current = Date.now();
      }
    }

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () =>
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, []);

  function segundosEnPantalla(): number {
    const enCurso = desde.current !== null ? Date.now() - desde.current : 0;
    return Math.round((acumulado.current + enCurso) / 1000);
  }

  async function alGuardar() {
    setError(null);
    setEnviando(true);

    try {
      const resultado = await guardarFase(
        inspeccionId,
        clavePaso,
        recolectar(),
        segundosEnPantalla()
      );

      if (!resultado.ok) {
        setError(resultado.error);
        setEnviando(false);
        // Sube al mensaje: en una pantalla larga el error queda fuera de
        // vista y parece que el botón no hizo nada.
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // La captura más reciente tiene que verse enseguida al volver al
      // índice o a esta misma fase. Sin refresh, Next puede reutilizar el
      // payload anterior y el inspector vería la calificación vieja.
      router.refresh();
      router.push(
        resultado.siguiente
          ? `/inspeccion/${inspeccionId}/${resultado.siguiente}`
          : `/inspeccion/${inspeccionId}`
      );
    } catch {
      setError("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-gutter">
          <button
            type="button"
            onClick={() => router.push(`/inspeccion/${inspeccionId}`)}
            aria-label="Volver al índice de la inspección"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold leading-tight text-ink">{titulo}</h1>
            <p className="text-xs leading-tight text-ink-muted">
              Paso {indice} de {total}
            </p>
          </div>
        </div>

        {/* Línea de avance pegada al encabezado: contexto permanente sin
            ocupar una fila entera de la pantalla. */}
        <div
          className="h-0.5 bg-brand-600 transition-[width] duration-300"
          style={{ width: `${Math.round((indice / total) * 100)}%` }}
        />
      </header>

      <main className="mx-auto max-w-3xl px-gutter pb-32 pt-5">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {descripcion && (
          <p className="mb-5 text-ink-secondary">{descripcion}</p>
        )}

        {children}
      </main>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line",
          "bg-surface/90 px-gutter pb-safe pt-3 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto max-w-3xl pb-3">
          {faltante && (
            <p className="mb-2 text-center text-sm text-ink-muted">{faltante}</p>
          )}
          <Button
            size="lg"
            block
            onClick={alGuardar}
            loading={enviando}
            disabled={Boolean(faltante)}
          >
            {enviando ? "Guardando…" : etiquetaBoton}
            {!enviando && <ArrowRight className="size-5" aria-hidden />}
          </Button>
        </div>
      </div>
    </>
  );
}
