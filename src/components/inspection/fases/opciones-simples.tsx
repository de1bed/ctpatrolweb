"use client";

import { useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Field, Textarea } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import { previo, type PropsFase } from "./tipos";

/**
 * Fases de una sola pregunta con opciones fijas.
 *
 * Tamaño, movimiento y estado de carga comparten forma exacta, así que
 * comparten componente. Escribir tres pantallas casi idénticas es cómo
 * empiezan a divergir: se arregla un detalle en una y se olvida en las otras.
 */

export function FaseTamano(props: PropsFase) {
  const [tamano, setTamano] = useState<string | null>(() =>
    previo<string | null>(props.datosPrevios, "tamano", null)
  );

  return (
    <PantallaFase
      {...props}
      descripcion="Medida de la caja o contenedor, en pies."
      faltante={!tamano ? "Selecciona el tamaño" : null}
      recolectar={() => ({ tamano })}
    >
      <OptionCards
        nombre="tamano"
        opciones={[
          { valor: "20", etiqueta: "20 pies" },
          { valor: "40", etiqueta: "40 pies" },
          { valor: "45", etiqueta: "45 pies" },
          { valor: "48", etiqueta: "48 pies" },
          { valor: "53", etiqueta: "53 pies" },
        ]}
        valor={tamano}
        onChange={setTamano}
        columnas={2}
      />
    </PantallaFase>
  );
}

export function FaseMovimiento(props: PropsFase) {
  const [movimiento, setMovimiento] = useState<string | null>(() =>
    previo<string | null>(props.datosPrevios, "movimiento", null)
  );
  const [otro, setOtro] = useState(() =>
    previo(props.datosPrevios, "movimientoOtro", "")
  );

  const faltaDescribir = movimiento === "otro" && otro.trim().length === 0;

  return (
    <PantallaFase
      {...props}
      descripcion="Hacia dónde va esta carga."
      faltante={
        !movimiento
          ? "Selecciona el movimiento"
          : faltaDescribir
            ? "Describe el movimiento"
            : null
      }
      recolectar={() => ({
        movimiento,
        movimientoOtro: movimiento === "otro" ? otro : "",
      })}
    >
      <div className="flex flex-col gap-5">
        <OptionCards
          nombre="movimiento"
          opciones={[
            { valor: "importacion", etiqueta: "Importación" },
            { valor: "exportacion", etiqueta: "Exportación" },
            { valor: "local", etiqueta: "Local" },
            { valor: "otro", etiqueta: "Otro" },
          ]}
          valor={movimiento}
          onChange={setMovimiento}
          columnas={2}
        />

        {movimiento === "otro" && (
          <Field label="¿Cuál?" required>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={otro}
                onChange={(e) => setOtro(e.target.value)}
                placeholder="Describe el tipo de movimiento"
              />
            )}
          </Field>
        )}
      </div>
    </PantallaFase>
  );
}

const OPCIONES_CARGA = [
  { valor: "cargado", etiqueta: "Cargado", descripcion: "Con mercancía a bordo" },
  { valor: "vacio", etiqueta: "Vacío", descripcion: "Sin carga" },
  {
    valor: "botando",
    etiqueta: "Botando",
    descripcion: "Deja la caja y se retira",
  },
];

export function FaseEstadoEntrada(props: PropsFase) {
  const [estado, setEstado] = useState<string | null>(() =>
    previo<string | null>(props.datosPrevios, "estado", null)
  );

  return (
    <PantallaFase
      {...props}
      descripcion="Cómo llegó la unidad al patio."
      faltante={!estado ? "Selecciona el estado" : null}
      recolectar={() => ({ estado })}
    >
      <OptionCards
        nombre="estado-entrada"
        opciones={OPCIONES_CARGA}
        valor={estado}
        onChange={setEstado}
      />
    </PantallaFase>
  );
}

export function FaseEstadoSalida(props: PropsFase) {
  const [estado, setEstado] = useState<string | null>(() =>
    previo<string | null>(props.datosPrevios, "estado", null)
  );

  return (
    <PantallaFase
      {...props}
      descripcion="Cómo se retira la unidad del patio."
      faltante={!estado ? "Selecciona el estado" : null}
      recolectar={() => ({ estado })}
    >
      <OptionCards
        nombre="estado-salida"
        opciones={OPCIONES_CARGA}
        valor={estado}
        onChange={setEstado}
      />
    </PantallaFase>
  );
}
