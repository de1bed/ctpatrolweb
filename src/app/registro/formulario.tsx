"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import {
  confirmarCorreo,
  reenviarVerificacion,
  registrarEmpresa,
  type EstadoRegistro,
} from "./actions";

const inicial: EstadoRegistro = { error: null };

export function FormularioRegistro() {
  const [estado, accion, enviando] = useActionState(registrarEmpresa, inicial);
  const [reenvio, reenviar, reenviando] = useActionState(
    reenviarVerificacion,
    inicial
  );
  const [confirmacion, confirmar, confirmando] = useActionState(
    confirmarCorreo,
    inicial
  );

  const pendiente =
    confirmacion.pendiente || reenvio.pendiente || estado.pendiente;
  const email = confirmacion.email || reenvio.email || estado.email;
  const nombre = confirmacion.nombre || reenvio.nombre || estado.nombre;
  const empresa = confirmacion.empresa || reenvio.empresa || estado.empresa;
  const error = confirmacion.error || reenvio.error || estado.error;

  if (pendiente && email) {
    return (
      <div className="flex flex-col gap-5">
        <Alerta tono="ok">
          {reenvio.reenviado
            ? `Te mandamos un código nuevo a ${email}.`
            : `Te enviamos un código a ${email}. Escríbelo para activar la cuenta.`}
        </Alerta>

        <form action={confirmar} className="flex flex-col gap-5">
          <input type="hidden" name="email" value={email} />
          {nombre ? <input type="hidden" name="nombre" value={nombre} /> : null}
          {empresa ? (
            <input type="hidden" name="empresa" value={empresa} />
          ) : null}
          {error && <Alerta>{error}</Alerta>}
          <Field
            label="Código"
            hint="6 u 8 dígitos. Revisa también spam."
          >
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
          {nombre ? <input type="hidden" name="nombre" value={nombre} /> : null}
          {empresa ? (
            <input type="hidden" name="empresa" value={empresa} />
          ) : null}
          <Button
            type="submit"
            size="lg"
            block
            loading={reenviando}
            variant="secondary"
          >
            {reenviando ? "Reenviando…" : "Reenviar código"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-5">
      {error && <Alerta>{error}</Alerta>}

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
        hint="Mínimo 10 caracteres. Después te mandamos un código al correo."
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
