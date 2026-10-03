"use client";

import { AlertCircle, Play } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { OptionCards, type Opcion } from "@/components/ui/option-cards";

import { crearInspeccion } from "./acciones";

type Modo = "individual" | "colectiva";

const MODOS: Opcion<Modo>[] = [
  {
    valor: "individual",
    etiqueta: "Individual",
    descripcion: "Solo tú la capturas.",
  },
  {
    valor: "colectiva",
    etiqueta: "Colectiva",
    descripcion:
      "Le aparece a toda tu empresa y otros se pueden sumar. Por ejemplo, uno hace la revisión externa y otro la interna.",
  },
];

export function BotonCrear() {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Sin valor inicial a propósito: se pregunta siempre, para que nadie abra
  // una colectiva (o una individual) sin darse cuenta.
  const [modo, setModo] = useState<Modo | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <OptionCards
          nombre="modo"
          leyenda="¿Quién va a capturar esta inspección?"
          opciones={MODOS}
          valor={modo}
          onChange={setModo}
        />
        <p className="mt-2 text-xs text-ink-muted">No se puede cambiar después de comenzar.</p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="lg"
        block
        loading={pendiente}
        disabled={!modo}
        onClick={() =>
          empezar(async () => {
            setError(null);
            // Cuando todo sale bien, la acción redirige y este código ya no
            // continúa. Solo se llega a leer el resultado si algo falló.
            const resultado = await crearInspeccion(modo === "colectiva");
            if (resultado && "error" in resultado) setError(resultado.error);
          })
        }
      >
        {!pendiente && <Play className="size-5" aria-hidden />}
        {pendiente ? "Creando…" : modo ? "Comenzar inspección" : "Elige una opción"}
      </Button>
    </div>
  );
}
