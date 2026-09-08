"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Card } from "@/components/ui/card";
import { OptionCards, Toggle } from "@/components/ui/option-cards";
import { construirFlujo } from "@/lib/inspection/flujo";
import {
  CAPACIDADES,
  TIPOS_TRANSPORTE,
  type TipoTransporte,
} from "@/lib/inspection/transporte";

import { previo, type PropsFase } from "./tipos";

/**
 * Fase 3 · Tipo de transporte.
 *
 * La decisión más importante del flujo: de aquí depende qué pantallas
 * existen. Por eso la pantalla muestra en vivo cuántos pasos va a tener la
 * inspección según lo elegido — el inspector ve la consecuencia antes de
 * confirmar, en lugar de descubrirla diez pantallas después.
 */
export function FaseTipoTransporte(props: PropsFase) {
  const [tipo, setTipo] = useState<TipoTransporte | null>(() =>
    previo<TipoTransporte | null>(props.datosPrevios, "tipo", null)
  );
  const [esFull, setEsFull] = useState(() =>
    previo(props.datosPrevios, "esFull", false)
  );

  const capacidades = tipo ? CAPACIDADES[tipo] : null;
  const admiteFull = capacidades?.admiteFull ?? false;

  // Vista previa del flujo resultante. Se calcula con el mismo motor que
  // usará la inspección real, así que no puede desincronizarse.
  const vistaPrevia = tipo
    ? construirFlujo({ tipoTransporte: tipo, esFull: admiteFull && esFull, completados: [] })
    : null;

  return (
    <PantallaFase
      {...props}
      descripcion="Define el resto de la inspección."
      faltante={!tipo ? "Selecciona el tipo de transporte" : null}
      recolectar={() => ({
        tipo,
        // Si el tipo no admite full, se guarda false aunque el interruptor
        // hubiera quedado encendido de una selección anterior.
        esFull: admiteFull ? esFull : false,
      })}
    >
      <div className="flex flex-col gap-5">
        <OptionCards
          nombre="tipo-transporte"
          opciones={TIPOS_TRANSPORTE.map((t) => ({
            valor: t,
            etiqueta: CAPACIDADES[t].nombre,
          }))}
          valor={tipo}
          onChange={(v) => setTipo(v as TipoTransporte)}
          columnas={2}
        />

        {/* El interruptor de full solo aparece donde tiene sentido. Mostrarlo
            deshabilitado para una pipa sería ruido que hay que interpretar. */}
        {admiteFull && (
          <Toggle
            etiqueta="Full (doble)"
            descripcion="Dos cajas o contenedores en la misma unidad"
            activo={esFull}
            onChange={setEsFull}
          />
        )}

        {vistaPrevia && (
          <Card className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink">
                Esta inspección tendrá {vistaPrevia.totalPasos} pasos
              </p>
              {vistaPrevia.omitidas.length > 0 && (
                <p className="mt-1 text-ink-secondary">
                  No aplican:{" "}
                  {vistaPrevia.omitidas.map((o) => o.fase.nombre).join(", ")}.
                </p>
              )}
              {admiteFull && esFull && (
                <p className="mt-1 text-ink-secondary">
                  Las fases de caja se capturan dos veces, una por unidad.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </PantallaFase>
  );
}
