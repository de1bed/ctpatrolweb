import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { coincideRuta } from "@/lib/auth-rutas";
import { clientEnv } from "@/lib/env";

import type { Database } from "./database.types";

/** Rutas que se pueden ver sin sesión. Todo lo demás exige estar dentro. */
const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/auth"];

/** Evidencia compartida por QR: pública a propósito, la abre quien tenga el enlace. */
const RUTAS_PUBLICAS_PREFIJO = ["/evidencia/"];

function esPublica(pathname: string): boolean {
  if (RUTAS_PUBLICAS.some((ruta) => coincideRuta(pathname, ruta))) return true;
  return RUTAS_PUBLICAS_PREFIJO.some((p) => pathname.startsWith(p));
}

function esPantallaDeAcceso(pathname: string): boolean {
  if (coincideRuta(pathname, "/login")) return true;
  if (coincideRuta(pathname, "/registro")) return true;
  // Pedir el correo de recuperación no tiene sentido si ya hay sesión.
  // /recuperar/nueva sí: llega del enlace del correo con sesión de recovery.
  if (pathname === "/recuperar") return true;
  return false;
}

/**
 * Refresca la sesión en cada petición y bloquea lo que requiere login.
 *
 * El chequeo de ROL no vive aquí a propósito: obligaría a consultar la base
 * en cada request, incluso para cargar un ícono. El rol se valida en el
 * layout de cada sección, que es donde de verdad importa y donde ya hay una
 * consulta de todos modos.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser y no getSession: getUser verifica el token contra el servidor de
  // auth. getSession solo lee la cookie, y una cookie se puede falsificar.
  const {
    data: { user: crudo },
  } = await supabase.auth.getUser();

  const user = crudo?.email_confirmed_at ? crudo : null;

  const { pathname } = request.nextUrl;

  if (!user && !esPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Para regresarlo a donde iba después de entrar.
    if (pathname !== "/") url.searchParams.set("volver", pathname);
    return NextResponse.redirect(url);
  }

  if (user && esPantallaDeAcceso(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
