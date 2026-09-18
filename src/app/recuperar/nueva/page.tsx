import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarcoAuth } from "@/components/auth/marco";
import { createClient } from "@/lib/supabase/server";

import { FormularioNuevaContrasena } from "./formulario";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NuevaContrasenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/recuperar");
  }

  return (
    <MarcoAuth
      titulo="Nueva contraseña"
      subtitulo="Elige una que no hayas usado en este dispositivo compartido."
    >
      <FormularioNuevaContrasena />
    </MarcoAuth>
  );
}
