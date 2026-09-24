"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { autorizarIa, recargarCreditos, type EstadoPlataforma } from "./acciones";

const INICIAL: EstadoPlataforma = { error: null };

export function ControlesEmpresa({
  empresaId,
  autorizada,
  creditos,
}: {
  empresaId: string;
  autorizada: boolean;
  creditos: number;
}) {
  const [autorizacion, enviarAutorizacion, pendienteAutorizacion] = useActionState(
    autorizarIa,
    INICIAL
  );
  const [recarga, enviarRecarga, pendienteRecarga] = useActionState(
    recargarCreditos,
    INICIAL
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={enviarAutorizacion} className="flex items-center gap-2">
        <input type="hidden" name="empresaId" value={empresaId} />
        <input type="hidden" name="autorizada" value={autorizada ? "false" : "true"} />
        <Button
          type="submit"
          variant={autorizada ? "secondary" : "primary"}
          size="sm"
          loading={pendienteAutorizacion}
        >
          {autorizada ? "Quitar IA" : "Autorizar IA"}
        </Button>
        <span className="text-sm text-ink-secondary">
          {autorizada ? "Autorizada" : "Sin autorizar"} · {creditos} créditos
        </span>
      </form>
      {autorizacion.error && (
        <p className="text-sm text-danger-600">{autorizacion.error}</p>
      )}

      <form action={enviarRecarga} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="empresaId" value={empresaId} />
        <label className="sr-only" htmlFor={`creditos-${empresaId}`}>
          Créditos a agregar
        </label>
        <input
          id={`creditos-${empresaId}`}
          name="creditos"
          type="number"
          min={1}
          defaultValue={100}
          required
          className="h-10 w-24 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
        />
        <Button type="submit" variant="secondary" size="sm" loading={pendienteRecarga}>
          Agregar créditos
        </Button>
      </form>
      {recarga.error && <p className="text-sm text-danger-600">{recarga.error}</p>}
      {recarga.ok && <p className="text-sm text-ok-700">{recarga.ok}</p>}
    </div>
  );
}
