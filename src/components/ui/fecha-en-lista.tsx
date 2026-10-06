"use client";

import { useSyncExternalStore } from "react";

import { fechaEnLista } from "@/lib/calendario";

const sinSuscripcion = () => () => {};

/**
 * "hace 2 horas" o "5 oct 2026, 10:32", en la zona del dispositivo.
 *
 * En el servidor se pinta con la zona que mandó la cookie (o la de México);
 * al hidratar se recalcula en el navegador, que es la que manda.
 */
export function FechaEnLista({ iso, tz }: { iso: string; tz?: string }) {
  const texto = useSyncExternalStore(
    sinSuscripcion,
    () => fechaEnLista(iso),
    () => fechaEnLista(iso, tz)
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {texto}
    </time>
  );
}
