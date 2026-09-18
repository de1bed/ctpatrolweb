"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  confirmarCorreo,
  type EstadoRegistro,
} from "@/app/registro/actions";

import {
  iniciarSesion,
  pedirVerificacion,
  type EstadoLogin,
} from "./actions";

const inicial: EstadoLogin = { error: null };
const inicialCodigo: EstadoRegistro = { error: null };

export function LoginForm({ volver }: { volver?: string }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);
  const [reenvio, reenviar, reenviando] = useActionState(
    pedirVerificacion,
    inicial
  );
  const [confirmacion, confirmar, confirmando] = useActionState(
    confirmarCorreo,
    inicialCodigo
  );

  const email = confirmacion.email || reenvio.email || estado.email;
  const sinConfirmar = Boolean(
    confirmacion.pendiente || reenvio.sinConfirmar || estado.sinConfirmar
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={accion} className="flex flex-col gap-5">
        {volver && <input type="hidden" name="volver" value={volver} />}

        {reenvio.reenviado && (
          <Alerta tono="ok">
            Si ese correo tiene una cuenta sin confirmar, en unos minutos llega
            el código. Revisa también spam.
          </Alerta>
        )}

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
              disabled={enviando || reenviando || confirmando}
              defaultValue={email}
            />
          )}
        </Field>

        <Field label="Contraseña">
          {(props) => (
            <CampoPassword
              {...props}
              name="password"
              autoComplete="current-password"
              disabled={enviando || reenviando || confirmando}
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

      {sinConfirmar && email && (
        <>
          <form action={confirmar} className="flex flex-col gap-5">
            <input type="hidden" name="email" value={email} />
            {confirmacion.error && <Alerta>{confirmacion.error}</Alerta>}
            <Field label="Código de verificación" hint="6 u 8 dígitos.">
              {(props) => (
                <Input
                  {...props}
                  name="codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  minLength={6}
                  maxLength={8}
                  pattern="[0-9]*"
                  placeholder="000000"
                  disabled={confirmando || reenviando}
                  className="text-center text-2xl font-semibold tracking-[0.35em]"
                />
              )}
            </Field>
            <Button type="submit" size="lg" block loading={confirmando}>
              {confirmando ? "Confirmando…" : "Confirmar código"}
            </Button>
          </form>

          <form action={reenviar}>
            <input type="hidden" name="email" value={email} />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              block
              loading={reenviando}
            >
              {reenviando ? "Reenviando…" : "Reenviar código"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
