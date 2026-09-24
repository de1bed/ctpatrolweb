"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { cambiarIaEmpresa, type EstadoAjustes } from "./acciones";

const INICIAL: EstadoAjustes = { error: null };

export function InterruptorIa({
  plataforma,
  activa,
  creditos,
}: {
  plataforma: boolean;
  activa: boolean;
  creditos: number;
}) {
  const [estado, enviar, pendiente] = useActionState(cambiarIaEmpresa, INICIAL);

  if (!plataforma) {
    return (
      <p className="text-sm text-ink-secondary">
        El análisis con IA no está autorizado para esta empresa. Cuando CTPatrol
        lo active, podrás encenderlo aquí.
      </p>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <p className="text-sm text-ink-secondary">
        Quedan <strong className="text-ink">{creditos}</strong> créditos. Cada
        foto analizada y cada documento escaneado usa 1. Si lo apagas, las
        inspecciones siguen igual, solo sin la segunda opinión de la IA.
      </p>
      <input type="hidden" name="activa" value={activa ? "false" : "true"} />
      <Button type="submit" variant={activa ? "secondary" : "primary"} loading={pendiente}>
        {activa ? "Apagar análisis con IA" : "Encender análisis con IA"}
      </Button>
      {estado.error && <p className="text-sm text-danger-600">{estado.error}</p>}
    </form>
  );
}
