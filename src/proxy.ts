import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo excepto lo que no necesita sesión:
     *   _next/static, _next/image  → build de Next
     *   favicon, manifest, sw.js   → PWA, los pide el navegador sin cookies
     *   archivos con extensión     → imágenes, fuentes, íconos
     *
     * Dejar fuera los estáticos importa: el middleware corre en cada petición
     * que empate, y refrescar la sesión para bajar un PNG es puro costo.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
