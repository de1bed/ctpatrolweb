"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  autorizarIa,
  cambiarEmpresaActiva,
  recargarCreditos,
  type EstadoPlataforma,
} from "./acciones";

const INICIAL: EstadoPlataforma = { error: null };

export function ControlesEmpresa({
  empresaId,
  autorizada,
  creditos,
  empresaActiva,
}: {
  empresaId: string;
  autorizada: boolean;
  creditos: number;
  empresaActiva: boolean;
}) {
  const [autorizacion, enviarAutorizacion, pendienteAutorizacion] = useActionState(
    autorizarIa,
    INICIAL
  );
  const [recarga, enviarRecarga, pendienteRecarga] = useActionState(
    recargarCreditos,
    INICIAL
  );
  const [acceso, enviarAcceso, pendienteAcceso] = useActionState(
    cambiarEmpresaActiva,
    INICIAL
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={enviarAcceso}>
        <input type="hidden" name="empresaId" value={empresaId} />
        <input type="hidden" name="activa" value={empresaActiva ? "false" : "true"} />
        <Button
          type="submit"
          variant={empresaActiva ? "danger" : "success"}
          size="sm"
          loading={pendienteAcceso}
        >
          {empresaActiva ? "Suspender empresa" : "Reactivar empresa"}
        </Button>
      </form>
      {acceso.error && <p className="text-sm text-danger-600">{acceso.error}</p>}
      {acceso.ok && <p className="text-sm text-ok-700">{acceso.ok}</p>}
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
        <Button
          type="submit"
          name="sentido"
          value="sumar"
          variant="secondary"
          size="sm"
          loading={pendienteRecarga}
        >
          Agregar
        </Button>
        <Button
          type="submit"
          name="sentido"
          value="restar"
          variant="danger"
          size="sm"
          loading={pendienteRecarga}
        >
          Quitar
        </Button>
      </form>
      {recarga.error && <p className="text-sm text-danger-600">{recarga.error}</p>}
      {recarga.ok && <p className="text-sm text-ok-700">{recarga.ok}</p>}
    </div>
  );
}
