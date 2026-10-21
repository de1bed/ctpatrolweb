import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Ancla la raíz del proyecto.
   *
   * Sin esto, Turbopack sube por el árbol de carpetas buscando un lockfile y
   * encuentra el de C:\Users\david, que no tiene nada que ver con esta app.
   * El build sigue funcionando pero resuelve módulos desde ahí, y eso produce
   * fallos que solo aparecen en la máquina de quien tenga ese archivo.
   */
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Nota: Next 16 quitó la llave `eslint` de aquí. El lint corre por
  // separado (`npm run lint`) y debe ser parte del CI, no del build.

  typescript: {
    // Ni si hay errores de tipos. Nunca poner esto en true "temporalmente":
    // así es como se llega a producción con media app rota.
    ignoreBuildErrors: false,
  },

  /**
   * Desactiva la normalización de URLs en el proxy para que las visitas
   * directas y las transiciones de cliente se manejen igual.
   *
   * Sin esto, /ajustes puede comportarse diferente cuando se abre
   * directamente en el navegador vs cuando se navega desde el menú.
   */
  skipProxyUrlNormalize: true,

  /**
   * Cabeceras de seguridad para todas las rutas.
   *
   * Vercel ya manda HSTS. Aquí añadimos las que faltan:
   *
   *   Content-Security-Policy   Controla de dónde pueden venir scripts,
   *                             estilos, imágenes, conexiones, etc.
   *   X-Frame-Options           Evita que la app se cargue en un iframe
   *                             ajeno (clickjacking). DENY es lo más seguro.
   *   X-Content-Type-Options    Impide que el navegador adivine el MIME type
   *                             y ejecute algo que no era ejecutable.
   *   Referrer-Policy           Limita cuánta información del referer se
   *                             manda a otros sitios.
   *   Permissions-Policy        Declara qué APIs del dispositivo se usan.
   *                             Cámara y geolocalización son las relevantes.
   *
   * La CSP es permisiva ('unsafe-inline', 'unsafe-eval') porque Next.js
   * inyecta scripts inline y Tailwind genera estilos inline. Se puede
   * endurecer con nonce, pero eso requiere un middleware que genere el
   * nonce y lo inyecte en cada respuesta.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
