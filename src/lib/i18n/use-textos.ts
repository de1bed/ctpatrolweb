"use client";

import { useSyncExternalStore } from "react";

import {
  leerIdioma,
  leerIdiomaServidor,
  suscribirIdioma,
  type Idioma,
} from "./idioma";
import { textos, type Textos } from "./textos";

/**
 * Textos de la interfaz en el idioma activo.
 *
 * Se llama `useTextos` y no `usarTextos` aunque el resto del código esté en
 * español: el prefijo "use" no es una palabra en inglés aquí, es la marca que
 * React y su linter usan para reconocer un hook y validar sus reglas. Con
 * otro nombre, las reglas de hooks dejan de aplicarse en silencio.
 *
 * `useSyncExternalStore` porque el idioma vive fuera de React: en
 * localStorage y en el atributo lang del documento. Copiarlo a estado con un
 * efecto provocaría un render extra y desincronizaría la hidratación.
 *
 * En el servidor devuelve español, que es el idioma base. Al hidratar, el
 * cliente aplica la preferencia real; el cambio es un re-render, no un
 * salto visible.
 */
export function useTextos(): { t: Textos; idioma: Idioma } {
  const idioma = useSyncExternalStore(
    suscribirIdioma,
    leerIdioma,
    leerIdiomaServidor
  );

  return { t: textos(idioma), idioma };
}
