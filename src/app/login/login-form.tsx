"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { iniciarSesion, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { error: null };

export function LoginForm({ volver }: { volver?: string }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="flex flex-col gap-5">
      {volver && <input type="hidden" name="volver" value={volver} />}

      {estado.error && <Alerta>{estado.error}</Alerta>}

      <Field label="Correo">
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            required
            autoComplete="username"
            // Sin esto, iOS pone mayúscula inicial en el correo y el login
            // falla sin que se vea por qué.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            placeholder="inspector@empresa.com"
            disabled={enviando}
          />
        )}
      </Field>

      <Field label="Contraseña">
        {(props) => (
          <CampoPassword
            {...props}
            name="password"
            autoComplete="current-password"
            disabled={enviando}
            required
          />
        )}
      </Field>

      <div className="-mt-2 text-right">
        <Link
          href="/recuperar"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Olvidé mi contraseña
        </Link>
      </div>

      <Button type="submit" size="lg" block loading={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
