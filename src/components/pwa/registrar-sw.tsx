"use client";

import { useEffect } from "react";

/**
 * Registra el service worker.
 *
 * Solo en producción: en desarrollo el service worker cachearía el bundle y
 * los cambios dejarían de verse al recargar, que es una hora perdida
 * buscando un bug que no existe.
 *
 * También exige HTTPS (o localhost). Es la misma restricción que la cámara y
 * el GPS: sin origen seguro, el navegador no registra nada.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Se espera al load para no competir por ancho de banda con el primer
    // render: el inspector quiere ver la pantalla, no que se precachee.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la app funciona igual, solo pierde el offline.
        // No vale la pena molestar al usuario con esto.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });

    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
