import type { Metadata } from "next";
import Link from "next/link";

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
      pie={
        <>
          ¿Primera vez?{" "}
          <Link
            href="/registro"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Crea la cuenta de tu empresa
          </Link>
        </>
      }
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
