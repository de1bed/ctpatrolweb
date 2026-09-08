"use client";

/**
 * Idioma de la interfaz.
 *
 * ── Por qué así y no con una librería ───────────────────────────────────────
 *
 * Son dos idiomas y un diccionario plano. Meter next-intl o i18next traería
 * enrutamiento por locale, negociación de cabeceras y carga diferida de
 * catálogos: infraestructura para un problema que aquí no existe. Un objeto
 * y un hook alcanzan, y se leen en treinta segundos.
 *
 * Vive fuera de React (localStorage + atributo lang del documento), así que
 * se expone como store externo igual que el tema. Ver `tema.ts`.
 */

export type Idioma = "es" | "en";

const LLAVE = "ctpatrol:idioma";

const oyentes = new Set<() => void>();

export function suscribirIdioma(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function leerIdioma(): Idioma {
  try {
    const guardado = localStorage.getItem(LLAVE);
    if (guardado === "es" || guardado === "en") return guardado;
  } catch {
    // Almacenamiento bloqueado.
  }

  // Sin preferencia guardada, se sigue al navegador. Un inspector con el
  // teléfono en inglés probablemente prefiere inglés.
  if (typeof navigator !== "undefined" && navigator.language?.startsWith("en")) {
    return "en";
  }
  return "es";
}

/** En el servidor no hay preferencia que leer: español es el idioma base. */
export function leerIdiomaServidor(): Idioma {
  return "es";
}

export function aplicarIdioma(idioma: Idioma): void {
  try {
    localStorage.setItem(LLAVE, idioma);
  } catch {
    // Sin almacenamiento el cambio dura lo que la sesión.
  }
  // El atributo lang importa de verdad: los lectores de pantalla eligen la
  // voz con él, y sin actualizarlo leerían inglés con fonética española.
  document.documentElement.lang = idioma;
  for (const o of oyentes) o();
}
