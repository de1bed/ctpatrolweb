"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { CampoPassword } from "@/components/auth/campo-password";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import {
  cambiarContrasena,
  type EstadoCambio,
} from "@/app/login/actions";

const inicial: EstadoCambio = { error: null, ok: false };

export function CambiarContrasena() {
  const [estado, accion, enviando] = useActionState(cambiarContrasena, inicial);

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
        Contraseña
      </h2>
      <p className="mb-4 text-sm text-ink-secondary">
        Si te la dieron temporal, cámbiala aquí. En un dispositivo compartido
        del patio, no dejes la provisional.
      </p>

      <form action={accion} className="flex flex-col gap-4">
        {estado.error && <Alerta>{estado.error}</Alerta>}
        {estado.ok && (
          <Alerta tono="ok">La contraseña se actualizó.</Alerta>
        )}

        <Field label="Contraseña actual">
          {(props) => (
            <CampoPassword
              {...props}
              name="actual"
              autoComplete="current-password"
              disabled={enviando}
              required
            />
          )}
        </Field>

        <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
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

        <Field label="Confirmar nueva contraseña">
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

        <Button type="submit" variant="secondary" loading={enviando}>
          {enviando ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
