"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  guardarNuevaContrasena,
  type EstadoNueva,
} from "@/app/login/actions";

const inicial: EstadoNueva = { error: null };

export function FormularioNuevaContrasena() {
  const [estado, accion, enviando] = useActionState(
    guardarNuevaContrasena,
    inicial
  );

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && <Alerta>{estado.error}</Alerta>}

      <Field
        label="Nueva contraseña"
        hint="Mínimo 10 caracteres."
      >
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
        {enviando ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
