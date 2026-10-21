import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Marco visual para las páginas legales.
 *
 * Diseño limpio y legible: el texto legal tiene que poder leerse sin esfuerzo.
 * Ancho máximo cómodo para lectura larga, tipografía generosa.
 */
export function MarcoLegal({
  titulo,
  ultimaActualizacion,
  children,
}: {
  titulo: string;
  ultimaActualizacion?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen-safe bg-surface px-gutter py-10">
      <article className="mx-auto max-w-2xl">
        <header className="mb-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <Image
              src="/icons/icon-256.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
            <span>CTPatrol</span>
          </Link>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
            {titulo}
          </h1>

          {ultimaActualizacion && (
            <p className="mt-2 text-sm text-ink-muted">
              Última actualización: {ultimaActualizacion}
            </p>
          )}
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          {children}
        </div>

        <footer className="mt-16 border-t border-line pt-8">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/privacidad"
              className="text-ink-secondary hover:text-brand-600"
            >
              Aviso de privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-ink-secondary hover:text-brand-600"
            >
              Términos y condiciones
            </Link>
            <Link
              href="/cookies"
              className="text-ink-secondary hover:text-brand-600"
            >
              Política de cookies
            </Link>
          </nav>
          <p className="mt-4 text-xs text-ink-muted">
            © {new Date().getFullYear()} Vortex Lab. Todos los derechos
            reservados.
          </p>
        </footer>
      </article>
    </main>
  );
}
