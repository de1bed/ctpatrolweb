import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { rutaInternaSegura } from "@/lib/auth-rutas";
import { createClient } from "@/lib/supabase/server";

/**
 * Intercambia el código de Supabase (confirmación, recovery) por una sesión.
 *
 * El enlace del correo aterriza aquí. Sin esta ruta, el usuario ve un 404
 * y la cookie de sesión nunca se escribe.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const siguiente = rutaInternaSegura(
    url.searchParams.get("next") ?? undefined,
    "/"
  );

  const supabase = await createClient();

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(new URL("/login?error=enlace", url.origin));
    }
    return NextResponse.redirect(new URL(siguiente, url.origin));
  }

  if (!codigo) {
    return NextResponse.redirect(new URL("/login?error=enlace", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=enlace", url.origin));
  }

  return NextResponse.redirect(new URL(siguiente, url.origin));
}
