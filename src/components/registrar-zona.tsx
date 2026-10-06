"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { COOKIE_ZONA } from "@/lib/zona";

/**
 * Le dice al servidor en qué zona horaria está este dispositivo.
 *
 * Si la cookie no existía o cambió (el teléfono viajó a otra zona), se
 * guarda y se refresca una vez para que las horas ya salgan bien.
 */
export function RegistrarZona() {
  const router = useRouter();
  useEffect(() => {
    let zona: string;
    try {
      zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zona) return;

    const valor = encodeURIComponent(zona);
    const actual = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_ZONA}=`))
      ?.slice(COOKIE_ZONA.length + 1);
    if (actual === valor) return;

    document.cookie = `${COOKIE_ZONA}=${valor}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
