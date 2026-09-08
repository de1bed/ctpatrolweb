"use client";

import { Check, PauseCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { SignaturePad } from "@/components/inspection/signature-pad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PASOS_VVTT, type PasoVvtt } from "@/lib/inspection/puntos";

import { previo, type PropsFase } from "./tipos";

type Sello = { numero: string } & Record<PasoVvtt, boolean>;

const SELLO_NUEVO: Sello = {
  numero: "",
  ver: false,
  verificar: false,
  jalar: false,
  girar: false,
};

/**
 * Fase · Sellos, con protocolo VVTT.
 *
 * Los cuatro pasos —ver, verificar, jalar, girar— son obligatorios por norma
 * C-TPAT, y se marcan uno por uno a propósito. Un solo botón de "sello
 * revisado" invitaría a palomearlo sin haber jalado nada; obligar a cuatro
 * toques conscientes es justo el punto del protocolo.
 */
export function FaseSellos(props: PropsFase) {
  const [sellos, setSellos] = useState<Sello[]>(() => {
    const previos = previo<Sello[]>(props.datosPrevios, "sellos", []);
    return previos.length > 0 ? previos : [{ ...SELLO_NUEVO }];
  });

  function actualizar(i: number, cambios: Partial<Sello>) {
    setSellos((prev) => prev.map((s, j) => (j === i ? { ...s, ...cambios } : s)));
  }

  const incompletos = sellos.filter(
    (s) =>
      !s.numero.trim() || !s.ver || !s.verificar || !s.jalar || !s.girar
  );

  const caja = props.contexto.unidad;

  return (
    <PantallaFase
      {...props}
      descripcion={
        caja
          ? `Sellos de la caja ${caja}. Marca los cuatro pasos en cada uno.`
          : "Marca los cuatro pasos del protocolo en cada sello."
      }
      faltante={
        incompletos.length > 0
          ? `Faltan datos en ${incompletos.length} ${incompletos.length === 1 ? "sello" : "sellos"}`
          : null
      }
      recolectar={() => ({ sellos })}
    >
      <div className="flex flex-col gap-3">
        {sellos.map((sello, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-2">
              <Field label={`Número de sello ${i + 1}`} required className="flex-1">
                {(p) => (
                  <Input
                    {...p}
                    value={sello.numero}
                    onChange={(e) => actualizar(i, { numero: e.target.value })}
                    placeholder="Ej. 0483712"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="numeric"
                  />
                )}
              </Field>

              {sellos.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar sello ${i + 1}`}
                  onClick={() => setSellos((p) => p.filter((_, j) => j !== i))}
                  className="mt-7 flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors active:bg-danger-50"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink-secondary">
                Protocolo VVTT
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PASOS_VVTT.map((paso) => {
                  const hecho = sello[paso.clave];
                  return (
                    <button
                      key={paso.clave}
                      type="button"
                      role="checkbox"
                      aria-checked={hecho}
                      onClick={() => actualizar(i, { [paso.clave]: !hecho } as Partial<Sello>)}
                      className={cn(
                        "flex min-h-14 items-center gap-2.5 rounded-xl border-2 px-3 text-left transition-colors",
                        hecho
                          ? "border-ok-600 bg-ok-50 dark:bg-ok-500/10"
                          : "border-line bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                          hecho
                            ? "border-ok-600 bg-ok-600 text-white"
                            : "border-line-strong"
                        )}
                      >
                        {hecho && <Check className="size-4" strokeWidth={3} aria-hidden />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {paso.nombre}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {paso.pista}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() => setSellos((p) => [...p, { ...SELLO_NUEVO }])}
          className="justify-start"
        >
          <Plus className="size-5" aria-hidden />
          Agregar otro sello
        </Button>
      </div>
    </PantallaFase>
  );
}

/**
 * Fase · Firmas.
 *
 * Cierra la inspección. Después de esto el expediente queda inmutable para el
 * inspector, así que la pantalla lo dice antes de que firme, no después.
 */
export function FaseFirmas(props: PropsFase) {
  const previas = previo<{
    inspector?: { nombre?: string; firma?: string };
    conductor?: { nombre?: string; firma?: string };
  }>(props.datosPrevios, "inspector", {} as never);

  const guardadas = (props.datosPrevios ?? {}) as {
    inspector?: { nombre?: string; firma?: string };
    conductor?: { nombre?: string; firma?: string };
  };

  const [nombreInspector, setNombreInspector] = useState(
    guardadas.inspector?.nombre ?? props.contexto.nombreInspector
  );
  const [firmaInspector, setFirmaInspector] = useState<string | null>(
    guardadas.inspector?.firma ?? null
  );
  const [nombreConductor, setNombreConductor] = useState(
    guardadas.conductor?.nombre ?? ""
  );
  const [firmaConductor, setFirmaConductor] = useState<string | null>(
    guardadas.conductor?.firma ?? null
  );

  void previas;

  const falta =
    !nombreInspector.trim()
      ? "Falta el nombre del inspector"
      : !firmaInspector
        ? "Falta la firma del inspector"
        : !nombreConductor.trim()
          ? "Falta el nombre del conductor"
          : !firmaConductor
            ? "Falta la firma del conductor"
            : null;

  return (
    <PantallaFase
      {...props}
      descripcion="Ambas firmas cierran la inspección."
      etiquetaBoton="Firmar y cerrar inspección"
      faltante={falta}
      recolectar={() => ({
        inspector: { nombre: nombreInspector.trim(), firma: firmaInspector },
        conductor: { nombre: nombreConductor.trim(), firma: firmaConductor },
      })}
    >
      <Card className="mb-5 flex items-start gap-3 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-warn-600" aria-hidden />
        <p className="text-sm text-ink-secondary">
          Al firmar, el expediente queda cerrado. Ya no vas a poder editarlo;
          solo un administrador puede reabrirlo. Revisa antes de firmar.
        </p>
      </Card>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Field label="Nombre del inspector" required>
            {(p) => (
              <Input
                {...p}
                value={nombreInspector}
                onChange={(e) => setNombreInspector(e.target.value)}
              />
            )}
          </Field>
          <SignaturePad
            etiqueta="Firma del inspector"
            valor={firmaInspector}
            onChange={setFirmaInspector}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Nombre del conductor" required>
            {(p) => (
              <Input
                {...p}
                value={nombreConductor}
                onChange={(e) => setNombreConductor(e.target.value)}
              />
            )}
          </Field>
          <SignaturePad
            etiqueta="Firma del conductor"
            valor={firmaConductor}
            onChange={setFirmaConductor}
          />
        </div>
      </div>
    </PantallaFase>
  );
}

/**
 * Fase · Pausa de carga.
 *
 * La unidad sale a cargar y vuelve sellada. Es un punto de corte real de la
 * operación, no un paso de captura: aquí no se pide nada, se confirma.
 */
export function FasePausa(props: PropsFase) {
  return (
    <PantallaFase
      {...props}
      descripcion="Punto de corte: la unidad sale a cargar y regresa sellada."
      etiquetaBoton="La unidad ya regresó, continuar"
      recolectar={() => ({})}
    >
      <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <PauseCircle className="size-12 text-warn-600" aria-hidden />
        <p className="text-lg font-semibold text-ink">
          Inspección previa terminada
        </p>
        <p className="max-w-sm text-ink-secondary">
          Puedes salir de aquí y retomar cuando la unidad regrese. Lo capturado
          hasta ahora ya está guardado.
        </p>
        <p className="max-w-sm text-sm text-ink-muted">
          Si continúas, se entiende que la unidad ya volvió y sigue la revisión
          de sellos.
        </p>
      </Card>
    </PantallaFase>
  );
}
