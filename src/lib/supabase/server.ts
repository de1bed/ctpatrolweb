import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv, serverEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers,
 * Server Actions).
 *
 * Usa la llave pública y la sesión del usuario, así que RLS aplica igual que
 * en el navegador. Es lo que queremos: el servidor no debe poder ver más de
 * lo que le toca al usuario que hizo la petición.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Los Server Components no pueden escribir cookies. No es un
            // problema: el middleware ya refrescó la sesión antes de llegar
            // aquí, así que el token que se está usando es válido.
          }
        },
      },
    }
  );
}

/**
 * Cliente con service role. SE SALTA RLS POR COMPLETO.
 *
 * Solo para lo que genuinamente no puede pasar por un usuario:
 *   · dar de alta usuarios (necesita la API de admin de Auth)
 *   · escribir reportes generados por el servidor
 *   · tareas de mantenimiento
 *
 * Nunca lo uses para "arreglar" un permiso que RLS está negando. Si RLS
 * bloquea algo que debería permitir, la política está mal — arregla la
 * política, no la brinques.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
