import type { MetadataRoute } from "next";

/**
 * Manifiesto PWA.
 *
 * Es lo que permite instalar CTPatrol en la pantalla de inicio y que abra
 * a pantalla completa, sin barra de navegador. Para el inspector la
 * diferencia es directa: un ícono que toca, no una URL que teclea.
 *
 * `display: standalone` además le da su propia entrada en el multitarea,
 * así que contestar una llamada no lo saca de la inspección.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CTPatrol · Inspecciones C-TPAT",
    short_name: "CTPatrol",
    description:
      "Flujo guiado de inspección C-TPAT con evidencia fotográfica y reportes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0c77bd",
    lang: "es-MX",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Maskable: Android recorta el ícono a la forma del launcher
        // (círculo, cuadrado redondeado, gota). Sin una versión con margen,
        // el logo sale mochado.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nueva inspección",
        short_name: "Nueva",
        description: "Arrancar una inspección C-TPAT",
        url: "/inspeccion/nueva",
      },
    ],
  };
}
