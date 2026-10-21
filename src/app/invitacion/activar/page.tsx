import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarcoAuth } from "@/components/auth/marco";
import { createClient } from "@/lib/supabase/server";

import { FormularioActivarCuenta } from "./formulario";

export const metadata: Metadata = { title: "Activar cuenta" };

export default async function ActivarCuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=enlace");
  }

  const nombre =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  const empresa =
    typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "";

  return (
    <MarcoAuth
      titulo="Activa tu cuenta"
      subtitulo={
        nombre
          ? `Hola ${nombre.split(" ")[0]}, elige una contraseña para entrar.`
          : "Elige una contraseña para entrar."
      }
    >
      <FormularioActivarCuenta />
    </MarcoAuth>
  );
}
