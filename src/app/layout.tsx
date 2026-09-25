import type { Metadata, Viewport } from "next";

import { RegistrarServiceWorker } from "@/components/pwa/registrar-sw";

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

/**
 * Safari anterior a 16.4 (iPadOS 16.4) no puede ejecutar Next.js.
 * En esos iPad la página no arranca y se ve el código de la app.
 * Este script es JavaScript viejo a propósito, para que sí corra ahí.
 */
const scriptNavegador = `
(function(){
  var viejo=false;
  try{
    if(typeof Object.hasOwn!=="function"||!Array.prototype.findLast)viejo=true;
    new RegExp("(?<=a)b");
  }catch(e){viejo=true}
  if(!viejo)return;
  function pintar(){
    if(!document.body)return;
    document.body.innerHTML='<main style="font-family:system-ui,sans-serif;padding:2rem;max-width:28rem;margin:0 auto;line-height:1.45;color:#0b1220"><h1 style="font-size:1.35rem;margin:0 0 .75rem">Este iPad no puede abrir CTPatrol</h1><p style="margin:0 0 .75rem">El sistema es anterior a iPadOS 16.4. En un iPad así Safari muestra código en lugar de la aplicación.</p><p style="margin:0">Revisa la versión en Ajustes, General, Información. Si no hay una actualización a 16.4 o más nueva, este modelo ya no la recibe.</p></main>';
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pintar);
  else pintar();
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptNavegador }} />
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
