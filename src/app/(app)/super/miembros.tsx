"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { cambiarMiembro, type EstadoPlataforma } from "./acciones";

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
  const protegido = persona.rol === "super_admin" || esYo;

  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium text-ink">
          {persona.nombre || persona.email}
          {esYo ? " (tú)" : ""}
        </p>
        <p className="text-xs font-semibold text-ink-muted">
          {ROL[persona.rol]} · {persona.activo ? "Activo" : "Suspendido"}
        </p>
      </div>
      <p className="truncate text-sm text-ink-secondary">{persona.email}</p>
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
        </form>
      )}
      {estado.error && <p className="mt-1 text-sm text-danger-600">{estado.error}</p>}
    </div>
  );
}
