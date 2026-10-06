"use client";

import { useSyncExternalStore } from "react";

import { formatearMomentoCorto } from "@/lib/inspection/momento";

const sinSuscripcion = () => () => {};

/**
 * Hora en la zona del dispositivo.
 *
 * El servidor corre en UTC: formatear ahí pondría "17:32" a algo que el
 * inspector vio a las 10:32. Se pinta vacío en el servidor y se llena al
 * hidratar, sin desajuste entre los dos renders.
 */
export function HoraLocal({ iso }: { iso: string }) {
  const texto = useSyncExternalStore(
    sinSuscripcion,
    () => formatearMomentoCorto(iso),
    () => ""
  );
  return <time dateTime={iso}>{texto}</time>;
}
