import Link from "next/link";
import type { Metadata } from "next";

import { Alerta } from "@/components/auth/alerta";
import { MarcoAuth } from "@/components/auth/marco";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  enlace: "Ese enlace ya no es válido. Pide uno nuevo o entra con tu contraseña.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const volver = typeof params.volver === "string" ? params.volver : undefined;
  const error =
    typeof params.error === "string" ? AVISOS[params.error] : undefined;

  return (
    <MarcoAuth
      titulo="Entrar"
      subtitulo="Inspecciones de seguridad C-TPAT"
      pie={<EnlacesLegales />}
    >
      {error && (
        <div className="mb-5">
          <Alerta>{error}</Alerta>
        </div>
      )}
      <LoginForm volver={volver} />
    </MarcoAuth>
  );
}

function EnlacesLegales() {
  return (
    <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
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
  );
}
