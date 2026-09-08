import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CTPatrol",
    template: "%s · CTPatrol",
  },
  description:
    "Inspecciones de seguridad C-TPAT: flujo guiado, evidencia fotográfica georreferenciada, análisis con IA y expedientes.",
  applicationName: "CTPatrol",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Hace que al agregarla a la pantalla de inicio en iPhone abra sin la
    // barra de Safari. Es la diferencia entre "un sitio" y "una app".
    capable: true,
    title: "CTPatrol",
    statusBarStyle: "default",
  },
  formatDetection: {
    // Safari convierte en enlace telefónico cualquier cosa que parezca un
    // número. Los folios y números de contenedor caen en la trampa y quedan
    // azules y subrayados a media inspección.
    telephone: false,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // El usuario sí puede hacer zoom: hay quien lo necesita para leer, y
  // bloquearlo es una barrera de accesibilidad real.
  maximumScale: 5,
  // Sin viewportFit: cover, iOS deja franjas blancas alrededor del notch y
  // env(safe-area-inset-*) siempre devuelve 0.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/**
 * Aplica el tema guardado ANTES del primer pintado.
 *
 * Sin esto hay un parpadeo blanco al abrir en modo oscuro: React todavía no
 * hidrata y el navegador ya pintó la página clara. De noche, en un patio,
 * ese flashazo es molesto de verdad.
 */
const scriptTema = `
(function(){try{var t=localStorage.getItem("ctpatrol:tema");
if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
