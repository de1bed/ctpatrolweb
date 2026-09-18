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
      pie={
        <>
          ¿La recuerdas?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Volver a entrar
          </Link>
        </>
      }
    >
      <FormularioRecuperar />
    </MarcoAuth>
  );
}
