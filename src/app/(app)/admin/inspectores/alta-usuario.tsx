"use client";

import { AlertCircle, Check, RefreshCw, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import { crearUsuario } from "./acciones";

/**
 * Genera una contraseña inicial legible pero fuerte.
 *
 * Se usa alfabeto sin caracteres ambiguos (0/O, 1/l/I): esta contraseña se
 * dicta por teléfono o se escribe en un papel, y una confusión ahí es una
 * llamada a soporte.
 */
function generarPassword(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function AltaUsuario() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{
    email: string;
    password: string;
    correoEnviado: boolean;
    errorCorreo?: string;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<string>("inspector");
  const [password, setPassword] = useState(generarPassword);

  function cerrar() {
    setAbierto(false);
    setCreado(null);
    setError(null);
    setEmail("");
    setNombre("");
    setRol("inspector");
    setPassword(generarPassword());
  }

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <UserPlus className="size-5" aria-hidden />
        Nuevo usuario
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrar}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo usuario"
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">
            {creado ? "Usuario creado" : "Nuevo usuario"}
          </h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        {creado ? (
          /* La contraseña se muestra UNA vez, aquí. No se guarda en claro en
             ningún lado, así que si el admin cierra sin copiarla, el camino
             es restablecerla, no recuperarla. */
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-ok-500/40 bg-ok-50 px-4 py-3 text-sm text-ok-700 dark:bg-ok-500/10 dark:text-ok-500">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {creado.correoEnviado
                  ? "Le enviamos la invitación a su correo, con estos datos. Pídele que cambie la contraseña al entrar."
                  : `La cuenta quedó lista, pero el correo no salió${creado.errorCorreo ? ` (${creado.errorCorreo})` : ""}. Pásale estos datos en mano.`}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-surface-sunken p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Correo
              </p>
              <p className="mb-3 select-all break-all font-mono text-ink" data-selectable>
                {creado.email}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Contraseña temporal
              </p>
              <p className="select-all break-all font-mono text-lg font-bold text-ink" data-selectable>
                {creado.password}
              </p>
            </div>

            <p className="text-sm text-ink-muted">
              Esta contraseña no se vuelve a mostrar. Cópiala antes de cerrar.
            </p>

            <Button block onClick={cerrar}>
              Entendido
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <Field label="Nombre completo" required>
              {(p) => (
                <Input
                  {...p}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez Ramírez"
                />
              )}
            </Field>

            <Field label="Correo" required>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inspector@empresa.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                />
              )}
            </Field>

            <OptionCards
              nombre="rol-nuevo-usuario"
              leyenda="Rol"
              opciones={[
                {
                  valor: "inspector",
                  etiqueta: "Inspector",
                  descripcion: "Captura inspecciones en campo",
                },
                {
                  valor: "admin",
                  etiqueta: "Administrador",
                  descripcion: "Gestiona la cuenta y ve todo",
                },
              ]}
              valor={rol}
              onChange={setRol}
            />

            <Field
              label="Contraseña temporal"
              hint="Generada al azar. Se muestra una sola vez."
            >
              {(p) => (
                <div className="flex gap-2">
                  <Input
                    {...p}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setPassword(generarPassword())}
                    aria-label="Generar otra contraseña"
                    className="shrink-0"
                  >
                    <RefreshCw className="size-5" aria-hidden />
                  </Button>
                </div>
              )}
            </Field>

            <Button
              block
              loading={pendiente}
              disabled={!nombre.trim() || !email.trim()}
              onClick={() =>
                empezar(async () => {
                  setError(null);
                  const r = await crearUsuario({
                    email: email.trim(),
                    nombre: nombre.trim(),
                    rol,
                    password,
                  });
                  if (r.ok) {
                    setCreado({
                      email: email.trim(),
                      password,
                      correoEnviado: Boolean(r.correoEnviado),
                      errorCorreo: r.errorCorreo,
                    });
                  }
                  else setError(r.error);
                })
              }
            >
              Crear e invitar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
