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
};

export default nextConfig;
