"use client";

import { AlertCircle, Check, Copy, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import { crearUsuario } from "./acciones";

export function AltaUsuario() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{
    email: string;
    urlInvitacion: string;
    correoEnviado: boolean;
    errorCorreo?: string;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<string>("inspector");
  const [copiado, setCopiado] = useState(false);

  function cerrar() {
    setAbierto(false);
    setCreado(null);
    setError(null);
    setEmail("");
    setNombre("");
    setRol("inspector");
    setCopiado(false);
  }

  const mensajeInvitacion = creado
    ? [
        "Te invitamos a CTPatrol. Activa tu cuenta con este enlace:",
        creado.urlInvitacion,
        "",
        "El enlace caduca en 7 días.",
      ].join("\n")
    : "";

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
            {creado ? "Invitación enviada" : "Nuevo usuario"}
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
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-ok-500/40 bg-ok-50 px-4 py-3 text-sm text-ok-700 dark:bg-ok-500/10 dark:text-ok-500">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {creado.correoEnviado
                  ? "Le enviamos la invitación por correo. Cuando entre al enlace, elegirá su propia contraseña."
                  : `La cuenta quedó lista, pero el correo no salió${creado.errorCorreo ? ` (${creado.errorCorreo})` : ""}. Pásale el enlace de abajo.`}
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
                Enlace de activación
              </p>
              <p className="select-all break-all font-mono text-sm text-brand-700" data-selectable>
                {creado.urlInvitacion}
              </p>
            </div>

            <Button
              variant="secondary"
              block
              onClick={() => {
                void navigator.clipboard.writeText(mensajeInvitacion).then(() => {
                  setCopiado(true);
                });
              }}
            >
              <Copy className="size-4" aria-hidden />
              {copiado ? "Mensaje copiado" : "Copiar mensaje para enviárselo"}
            </Button>

            <p className="text-sm text-ink-muted">
              El enlace es de un solo uso y caduca en 7 días.
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

            <p className="text-sm text-ink-secondary">
              Le enviaremos un enlace de activación por correo. Cuando entre,
              elegirá su propia contraseña.
            </p>

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
                  });
                  if (r.ok) {
                    setCreado({
                      email: email.trim(),
                      urlInvitacion: r.urlEntrar ?? "/login",
                      correoEnviado: Boolean(r.correoEnviado),
                      errorCorreo: r.errorCorreo,
                    });
                  } else {
                    setError(r.error);
                  }
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
