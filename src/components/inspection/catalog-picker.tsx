"use client";

import { Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  buscarCatalogo,
  crearEnCatalogo,
  type ItemCatalogo,
  type TipoCatalogo,
} from "@/app/(flujo)/inspeccion/[id]/catalogo-acciones";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * Selector de catálogo con búsqueda y alta opcional.
 *
 * Lo usan transportista, conductor, tractor y contenedor: la interacción es
 * la misma y las diferencias caben en las props.
 *
 * La búsqueda espera 300 ms tras la última tecla. Sin eso, escribir
 * "TRANSPORTES" dispara once consultas y el inspector ve la lista brincar
 * mientras teclea.
 */
export type SeleccionCatalogo = {
  id: string | null;
  nombre: string;
  detalle?: string | null;
};

export function CatalogPicker({
  tipo,
  etiqueta,
  placeholder,
  etiquetaDetalle,
  puedeCrear,
  seleccionado,
  onSeleccionar,
  ayuda,
  ayudaDetalle,
  required = true,
}: {
  tipo: TipoCatalogo;
  etiqueta: string;
  placeholder: string;
  /** Nombre del segundo campo al dar de alta (placas, licencia, RFC…). */
  etiquetaDetalle: string;
  puedeCrear: boolean;
  seleccionado: SeleccionCatalogo | null;
  onSeleccionar: (v: SeleccionCatalogo | null) => void;
  ayuda?: string;
  ayudaDetalle?: string;
  required?: boolean;
}) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<ItemCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [detalleNuevo, setDetalleNuevo] = useState("");
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  // Evita pintar resultados de una búsqueda vieja que llegó tarde: si el
  // inspector siguió escribiendo, esa respuesta ya no corresponde.
  const peticion = useRef(0);

  useEffect(() => {
    if (seleccionado) return;

    const id = ++peticion.current;

    // El indicador de carga se enciende DENTRO del temporizador, no en el
    // cuerpo del efecto: hacerlo de forma síncrona dispara un render extra en
    // cada tecla, justo lo que el rebote de 300 ms viene a evitar.
    const t = setTimeout(async () => {
      setBuscando(true);
      const items = await buscarCatalogo(tipo, termino);
      if (id === peticion.current) {
        setResultados(items);
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [termino, tipo, seleccionado]);

  // ── Ya hay algo elegido ────────────────────────────────────────────────
  if (seleccionado) {
    return (
      <Field label={etiqueta} required={required} ayuda={ayuda}>
        {() => (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 rounded-xl border-2 border-brand-600 bg-brand-50 p-3.5 dark:bg-brand-950/50">
              <Check className="size-5 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">
                  {seleccionado.nombre}
                </span>
                {seleccionado.detalle ? (
                  <span className="block truncate text-sm text-ink-muted">
                    {etiquetaDetalle}: {seleccionado.detalle}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => {
                  onSeleccionar(null);
                  setTermino("");
                  setCreando(false);
                }}
                aria-label={`Cambiar ${etiqueta.toLowerCase()}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors active:bg-surface-sunken"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </Field>
    );
  }

  // ── Alta de uno nuevo ──────────────────────────────────────────────────
  if (creando) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-line-strong p-4">
        <p className="font-semibold text-ink">Registrar {etiqueta.toLowerCase()}</p>

        {errorAlta && (
          <p role="alert" className="text-sm text-danger-600">
            {errorAlta}
          </p>
        )}

        <Field label={etiqueta} required={required} ayuda={ayuda}>
          {(p) => (
            <Input
              {...p}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          )}
        </Field>

        <Field label={etiquetaDetalle} ayuda={ayudaDetalle}>
          {(p) => (
            <Input
              {...p}
              value={detalleNuevo}
              onChange={(e) => setDetalleNuevo(e.target.value)}
            />
          )}
        </Field>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setCreando(false);
              setErrorAlta(null);
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            loading={pendiente}
            disabled={termino.trim().length === 0}
            className="flex-1"
            onClick={() =>
              empezar(async () => {
                setErrorAlta(null);
                const r = await crearEnCatalogo({
                  tipo,
                  nombre: termino.trim(),
                  detalle: detalleNuevo.trim() || undefined,
                });
                if (r.ok) {
                  onSeleccionar({
                    id: r.item.id,
                    nombre: r.item.etiqueta,
                    detalle: r.item.detalle,
                  });
                  setCreando(false);
                } else {
                  setErrorAlta(r.error);
                }
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  // ── Búsqueda ───────────────────────────────────────────────────────────
  return (
    <Field label={etiqueta} required={required} ayuda={ayuda}>
      {(p) => (
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <Input
              {...p}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder={placeholder}
              className="pl-11"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            {buscando && (
              <LoaderCircle
                className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin text-ink-muted"
                aria-hidden
              />
            )}
          </div>

          {resultados.length > 0 && (
            <ul className="overflow-hidden rounded-xl border border-line bg-surface-raised">
              {resultados.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSeleccionar({
                        id: item.id,
                        nombre: item.etiqueta,
                        detalle: item.detalle,
                      })
                    }
                    className={cn(
                      "flex min-h-12 w-full items-center px-4 py-3 text-left",
                      "transition-colors active:bg-surface-sunken",
                      i > 0 && "border-t border-line"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">
                        {item.etiqueta}
                      </span>
                      {item.detalle && (
                        <span className="block truncate text-sm text-ink-muted">
                          {item.detalle}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!buscando && termino.trim().length > 0 && resultados.length === 0 && (
            <p className="px-1 text-sm text-ink-muted">
              Sin coincidencias para “{termino.trim()}”.
            </p>
          )}

          {puedeCrear ? (
            <Button
              variant="secondary"
              onClick={() => setCreando(true)}
              className="justify-start"
            >
              <Plus className="size-5" aria-hidden />
              Registrar {etiqueta.toLowerCase()} nuevo
            </Button>
          ) : (
            // Se explica la ausencia del botón. Sin esto, el inspector que no
            // encuentra su conductor se queda atorado sin saber por qué no
            // puede agregarlo.
            <p className="px-1 text-sm text-ink-muted">
              No tienes permiso para dar de alta. Si no aparece, pídele a tu
              administrador que lo registre.
            </p>
          )}
        </div>
      )}
    </Field>
  );
}
