"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { FormularioProgramar } from "@/components/calendario/formulario-programar";
import { Button } from "@/components/ui/button";

/** Abre el alta con fecha e inspector ya puestos, desde un día del calendario. */
export function BotonProgramar({
  inspectores,
  fechaInicial,
  inspectorInicial,
  etiqueta = "Programar este día",
}: {
  inspectores: { id: string; nombre: string }[];
  fechaInicial?: string;
  inspectorInicial?: string;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <Plus className="size-5" aria-hidden />
        {etiqueta}
      </Button>
      <FormularioProgramar
        inspectores={inspectores}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        fechaInicial={fechaInicial}
        inspectorInicial={inspectorInicial}
      />
    </>
  );
}
