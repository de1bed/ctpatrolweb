"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { activarCuenta, type EstadoActivar } from "./acciones";

const inicial: EstadoActivar = { error: null };

export function FormularioActivarCuenta() {
  const [estado, accion, enviando] = useActionState(activarCuenta, inicial);

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && <Alerta>{estado.error}</Alerta>}

      <Field label="Contraseña" hint="Mínimo 10 caracteres.">
        {(props) => (
          <CampoPassword
            {...props}
            name="password"
            autoComplete="new-password"
            disabled={enviando}
            required
            minLength={10}
          />
        )}
      </Field>

      <Field label="Confirmar contraseña">
        {(props) => (
          <CampoPassword
            {...props}
            name="confirmacion"
            autoComplete="new-password"
            disabled={enviando}
            required
            minLength={10}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={enviando}>
        {enviando ? "Activando…" : "Activar cuenta y entrar"}
      </Button>
    </form>
  );
}
