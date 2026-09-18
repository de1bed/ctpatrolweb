"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { pedirRecuperacion, type EstadoRecuperar } from "@/app/login/actions";

const inicial: EstadoRecuperar = { error: null, enviado: false };

export function FormularioRecuperar() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, inicial);

  if (estado.enviado) {
    return (
      <Alerta tono="ok">
        Si ese correo tiene cuenta, en unos minutos llega el enlace para
        elegir una contraseña nueva. Revisa también spam.
      </Alerta>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && <Alerta>{estado.error}</Alerta>}

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
            placeholder="inspector@empresa.com"
            disabled={enviando}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={enviando}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
