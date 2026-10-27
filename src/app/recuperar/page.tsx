import type { Metadata } from "next";
import Link from "next/link";

import { MarcoAuth } from "@/components/auth/marco";

import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <MarcoAuth
      titulo="Recuperar contraseña"
      subtitulo="Te enviamos un enlace al correo de tu cuenta."
      pie={<PieRecuperar />}
    >
      <FormularioRecuperar />
    </MarcoAuth>
  );
}

function PieRecuperar() {
  return (
    <div className="space-y-3">
      <p>
        ¿La recuerdas?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Volver a entrar
        </Link>
      </p>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-ink-muted">
        <Link href="/privacidad" className="hover:text-brand-600">
          Aviso de privacidad
        </Link>
        <Link href="/terminos" className="hover:text-brand-600">
          Términos
        </Link>
        <Link href="/cookies" className="hover:text-brand-600">
          Cookies
        </Link>
      </nav>
    </div>
  );
}
