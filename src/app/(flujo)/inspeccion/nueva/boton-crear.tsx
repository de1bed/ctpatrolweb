"use client";

import { AlertCircle, Play } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { crearInspeccion } from "./acciones";

export function BotonCrear() {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
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
        onClick={() =>
          empezar(async () => {
            setError(null);
            // Cuando todo sale bien, la acción redirige y este código ya no
            // continúa. Solo se llega a leer el resultado si algo falló.
            const resultado = await crearInspeccion();
            if (resultado && "error" in resultado) setError(resultado.error);
          })
        }
      >
        {!pendiente && <Play className="size-5" aria-hidden />}
        {pendiente ? "Creando…" : "Comenzar inspección"}
      </Button>
    </div>
  );
}
