"use client";

/**
 * Tema de la interfaz.
 *
 * Es estado que vive FUERA de React: en localStorage y en un atributo del
 * <html>. Por eso se expone como un store externo con suscripción, que es
 * justo el caso para el que existe `useSyncExternalStore`.
 *
 * La alternativa —useState más un efecto que lee localStorage— obliga a
 * llamar setState dentro del efecto, provoca un render extra y desincroniza
 * el servidor del cliente en la hidratación.
 *
 * El valor inicial ya lo aplicó un script en el <head> antes del primer
 * pintado (ver layout.tsx), así que aquí no hay parpadeo que corregir.
 */

export type Tema = "light" | "dark" | "sistema";

const LLAVE = "ctpatrol:tema";

const oyentes = new Set<() => void>();

function avisar() {
  for (const o of oyentes) o();
}

export function suscribirTema(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  // Otra pestaña puede cambiar el tema; "storage" avisa de eso.
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function leerTema(): Tema {
  try {
    const v = localStorage.getItem(LLAVE);
    return v === "light" || v === "dark" ? v : "sistema";
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return "sistema";
  }
}

/** En el servidor no hay preferencia guardada que leer. */
export function leerTemaServidor(): Tema {
  return "sistema";
}

export function aplicarTema(tema: Tema): void {
  try {
    if (tema === "sistema") {
      localStorage.removeItem(LLAVE);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(LLAVE, tema);
      document.documentElement.setAttribute("data-theme", tema);
    }
  } catch {
    // Sin almacenamiento, el cambio aplica solo a esta sesión.
    if (tema === "sistema") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", tema);
    }
  }
  avisar();
}
