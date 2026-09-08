"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { iniciarSesion, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { error: null };

export function LoginForm({ volver }: { volver?: string }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);
  const [verPassword, setVerPassword] = useState(false);

  return (
    <form action={accion} className="flex flex-col gap-5">
      {volver && <input type="hidden" name="volver" value={volver} />}

      {estado.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.error}</span>
        </div>
      )}

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
          <div className="relative">
            <Input
              {...props}
              name="password"
              type={verPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={enviando}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              // Con guantes o con prisa, una contraseña se teclea mal seguido.
              // Poder verla evita el ciclo de fallar y reintentar.
              aria-label={
                verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink"
            >
              {verPassword ? (
                <EyeOff className="size-5" aria-hidden />
              ) : (
                <Eye className="size-5" aria-hidden />
              )}
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" size="lg" block loading={enviando} className="mt-1">
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
