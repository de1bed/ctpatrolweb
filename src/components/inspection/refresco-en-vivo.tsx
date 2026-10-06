"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refresca la lista mientras haya colectivas abiertas, para que el "EN VIVO"
 * y quién se unió se vean sin recargar. Con la pantalla apagada no consulta.
 */
export function RefrescoEnVivo({ activo, segundos = 20 }: { activo: boolean; segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => window.clearInterval(intervalo);
  }, [activo, segundos, router]);
  return null;
}
