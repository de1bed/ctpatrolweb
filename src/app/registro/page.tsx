import type { Metadata } from "next";
import Link from "next/link";

import { MarcoAuth } from "@/components/auth/marco";

import { FormularioRegistro } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <MarcoAuth
      titulo="Registrar empresa"
      subtitulo="Tú quedas como administrador. Después das de alta a los inspectores."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Entrar
          </Link>
        </>
      }
    >
      <FormularioRegistro />
    </MarcoAuth>
  );
}
