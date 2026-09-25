"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

import { cambiarMiembro, eliminarPersona, renombrarPersona, type EstadoPlataforma } from "./acciones";
import { DialogoDosPasos } from "./dialogo";

const INICIAL: EstadoPlataforma = { error: null };

export type PersonaEmpresa = {
  id: string;
  nombre: string;
  email: string;
  rol: "super_admin" | "admin" | "inspector";
  activo: boolean;
};

const ROL: Record<PersonaEmpresa["rol"], string> = {
  super_admin: "Super admin",
  admin: "Admin",
  inspector: "Inspector",
};

export function ListaMiembros({
  titulo,
  personas,
  yoId,
}: {
  titulo: string;
  personas: PersonaEmpresa[];
  yoId: string;
}) {
  if (personas.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
        {titulo} · {personas.length}
      </h3>
      <ul className="flex flex-col gap-2">
        {personas.map((persona) => (
          <li key={persona.id}>
            <FilaMiembro persona={persona} esYo={persona.id === yoId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilaMiembro({ persona, esYo }: { persona: PersonaEmpresa; esYo: boolean }) {
  const [estado, enviar, pendiente] = useActionState(cambiarMiembro, INICIAL);
  const [nombreEstado, enviarNombre, pendienteNombre] = useActionState(
    renombrarPersona,
    INICIAL
  );
  const [pasoBorrar, setPasoBorrar] = useState<0 | 1 | 2>(0);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [pendienteBorrar, empezarBorrar] = useTransition();
  const protegido = persona.rol === "super_admin" || esYo;
  const visible = persona.nombre || persona.email;

  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium text-ink">
          {visible}
          {esYo ? " (tú)" : ""}
        </p>
        <p className="text-xs font-semibold text-ink-muted">
          {ROL[persona.rol]} · {persona.activo ? "Activo" : "Suspendido"}
        </p>
      </div>
      <p className="truncate text-sm text-ink-secondary">{persona.email}</p>
      <form action={enviarNombre} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="miembroId" value={persona.id} />
        <label className="sr-only" htmlFor={`nombre-persona-${persona.id}`}>
          Nombre
        </label>
        <Input
          id={`nombre-persona-${persona.id}`}
          name="nombre"
          defaultValue={persona.nombre}
          required
          minLength={2}
          maxLength={120}
          className="h-10 min-w-0 flex-1 py-2 text-sm"
        />
        <Button type="submit" variant="secondary" size="sm" loading={pendienteNombre}>
          Guardar nombre
        </Button>
      </form>
      {nombreEstado.error && <p className="mt-1 text-sm text-danger-600">{nombreEstado.error}</p>}
      {nombreEstado.ok && <p className="mt-1 text-sm text-ok-700">{nombreEstado.ok}</p>}
      {!protegido && (
        <form action={enviar} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="miembroId" value={persona.id} />
          <Button
            type="submit"
            name="rol"
            value={persona.rol === "admin" ? "inspector" : "admin"}
            variant="secondary"
            size="sm"
            loading={pendiente}
          >
            {persona.rol === "admin" ? "Quitar admin" : "Hacer admin"}
          </Button>
          <Button
            type="submit"
            name="activo"
            value={persona.activo ? "false" : "true"}
            variant={persona.activo ? "danger" : "success"}
            size="sm"
            loading={pendiente}
          >
            {persona.activo ? "Suspender" : "Reactivar"}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setPasoBorrar(1)}
          >
            Eliminar
          </Button>
        </form>
      )}
      {estado.error && <p className="mt-1 text-sm text-danger-600">{estado.error}</p>}
      {estado.ok && <p className="mt-1 text-sm text-ok-700">{estado.ok}</p>}
      {pasoBorrar > 0 && (
        <DialogoDosPasos
          titulo="Eliminar persona"
          mensaje={
            pasoBorrar === 1
              ? `¿Seguro que deseas eliminar a ${visible}?`
              : "Se borra de verdad. Ese correo podrá registrarse otra vez. ¿Seguro que deseas eliminar?"
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
              const r = await eliminarPersona(persona.id);
              if (r.error) setErrorBorrar(r.error);
              else setPasoBorrar(0);
            });
          }}
        />
      )}
    </div>
  );
}

