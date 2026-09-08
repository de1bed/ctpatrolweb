import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

/**
 * Login.
 *
 * En teléfono ocupa la pantalla completa, sin tarjeta ni bordes: en móvil
 * una tarjeta flotando sobre fondo gris se ve como formulario web.
 * De iPad en adelante sí aparece la tarjeta centrada, que es lo que se
 * espera en una pantalla grande.
 */
export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const volver = typeof params.volver === "string" ? params.volver : undefined;

  return (
    <main className="flex min-h-screen-safe flex-col justify-center bg-surface px-safe sm:bg-surface-sunken">
      <div className="mx-auto w-full max-w-sm px-6 py-10 sm:max-w-md sm:rounded-3xl sm:border sm:border-line sm:bg-surface sm:px-8 sm:py-10 sm:shadow-[var(--shadow-card)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/icons/icon.svg"
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-2xl"
            priority
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            CTPatrol
          </h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Inspecciones de seguridad C-TPAT
          </p>
        </div>

        <LoginForm volver={volver} />

        <p className="mt-8 text-center text-sm text-ink-muted">
          ¿Problemas para entrar? Escribe a tu administrador.
        </p>
      </div>
    </main>
  );
}
