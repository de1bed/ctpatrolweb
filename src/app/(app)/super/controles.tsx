"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

import {
  autorizarIa,
  cambiarEmpresaActiva,
  eliminarEmpresa,
  recargarCreditos,
  renombrarEmpresa,
  type EstadoPlataforma,
} from "./acciones";
import { DialogoDosPasos } from "./dialogo";

const INICIAL: EstadoPlataforma = { error: null };

export function ControlesEmpresa({
  empresaId,
  nombre,
  autorizada,
  creditos,
  empresaActiva,
}: {
  empresaId: string;
  nombre: string;
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
  const [nombreEstado, enviarNombre, pendienteNombre] = useActionState(
    renombrarEmpresa,
    INICIAL
  );
  const [pasoBorrar, setPasoBorrar] = useState<0 | 1 | 2>(0);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [pendienteBorrar, empezarBorrar] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <form action={enviarNombre} className="flex flex-col gap-2">
        <input type="hidden" name="empresaId" value={empresaId} />
        <label htmlFor={`nombre-${empresaId}`} className="text-sm font-medium text-ink">
          Nombre de la empresa
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={`nombre-${empresaId}`}
            name="nombre"
            defaultValue={nombre}
            required
            minLength={2}
            maxLength={120}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" size="sm" loading={pendienteNombre}>
            Guardar
          </Button>
        </div>
      </form>
      {nombreEstado.error && <p className="text-sm text-danger-600">{nombreEstado.error}</p>}
      {nombreEstado.ok && <p className="text-sm text-ok-700">{nombreEstado.ok}</p>}
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

      <Button variant="danger" size="sm" onClick={() => setPasoBorrar(1)}>
        Eliminar empresa
      </Button>
      {pasoBorrar > 0 && (
        <DialogoDosPasos
          titulo="Eliminar empresa"
          mensaje={
            pasoBorrar === 1
              ? `¿Seguro que deseas eliminar ${nombre}?`
              : "Se borra de verdad, con sus usuarios y sus inspecciones. Esos correos podrán registrarse otra vez. ¿Seguro que deseas eliminar?"
          }
          pendiente={pendienteBorrar}
          error={errorBorrar}
          onNo={() => {
            setPasoBorrar(0);
            setErrorBorrar(null);
          }}
          onSi={() => {
            if (pasoBorrar === 1) {
              setPasoBorrar(2);
              return;
            }
            empezarBorrar(async () => {
              const r = await eliminarEmpresa(empresaId);
              if (r.error) setErrorBorrar(r.error);
              else setPasoBorrar(0);
            });
          }}
        />
      )}
    </div>
  );
}
