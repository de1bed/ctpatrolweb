"use client";

import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el navegador.
 *
 * Se guarda una sola instancia por pestaña. Si se creara uno nuevo en cada
 * render, cada copia levantaría su propio manejador de sesión y competirían
 * por refrescar el token: sesiones que se caen solas sin razón aparente.
 */
let instancia: ReturnType<typeof crear> | null = null;

function crear() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function createClient() {
  if (!instancia) instancia = crear();
  return instancia;
}
