"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { registrarEmpresa, type EstadoRegistro } from "./actions";

const inicial: EstadoRegistro = { error: null };

export function FormularioRegistro() {
  const [estado, accion, enviando] = useActionState(registrarEmpresa, inicial);

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && <Alerta>{estado.error}</Alerta>}

      <Field
        label="Empresa"
        hint="Como debe aparecer en los reportes de inspección."
      >
        {(props) => (
          <Input
            {...props}
            name="empresa"
            required
            autoComplete="organization"
            placeholder="Transportes del Norte"
            disabled={enviando}
          />
        )}
      </Field>

      <Field label="Tu nombre">
        {(props) => (
          <Input
            {...props}
            name="nombre"
            required
            autoComplete="name"
            placeholder="María López"
            disabled={enviando}
          />
        )}
      </Field>

      <Field label="Correo">
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            required
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            placeholder="admin@empresa.com"
            disabled={enviando}
          />
        )}
      </Field>

      <Field
        label="Contraseña"
        hint="Mínimo 10 caracteres. Guárdala: no hay otra forma de entrar."
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
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
