import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Marco visual de las pantallas de acceso.
 *
 * En teléfono ocupa la pantalla completa, sin tarjeta: en móvil una tarjeta
 * flotando sobre fondo gris se ve como formulario web. De iPad en adelante
 * sí aparece la tarjeta centrada.
 */
export function MarcoAuth({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen-safe flex-col justify-center bg-surface px-safe sm:bg-surface-sunken">
      <div className="mx-auto w-full max-w-sm px-6 py-10 sm:max-w-md sm:rounded-3xl sm:border sm:border-line sm:bg-surface sm:px-8 sm:py-10 sm:shadow-[var(--shadow-card)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/icons/icon-256.png"
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-2xl"
            priority
          />
          <p className="mt-5 text-sm font-semibold tracking-wide text-brand-600">
            CTPatrol
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-1.5 text-sm text-ink-secondary">{subtitulo}</p>
          )}
        </div>

        {children}

        {pie && <div className="mt-8 text-center text-sm text-ink-muted">{pie}</div>}
      </div>
    </main>
  );
}
