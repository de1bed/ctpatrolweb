/**
 * Service worker de CTPatrol.
 *
 * ── Qué resuelve ────────────────────────────────────────────────────────────
 *
 * Que el inspector pueda abrir la app en un patio sin señal. Guarda el código
 * de la aplicación la primera vez que entra con red; a partir de ahí la app
 * arranca aunque no haya conexión, y la evidencia que capture se queda en
 * IndexedDB hasta que vuelva la señal.
 *
 * ── Qué NO cachea, y por qué ────────────────────────────────────────────────
 *
 * Nada de Supabase. Ni datos, ni sesión, ni evidencia. Tres razones:
 *
 *   1. Seguridad. Una respuesta de autenticación en caché es una sesión que
 *      sobrevive al cierre de sesión.
 *   2. Aislamiento. Las respuestas van filtradas por RLS según QUIÉN pregunta;
 *      una respuesta cacheada podría servirse a otro usuario del dispositivo.
 *   3. Corrección. Una inspección es estado que cambia; servirla de caché
 *      mostraría avance viejo y el inspector recapturaría de más.
 *
 * Escribir a mano y no con una librería porque la política de caché de esta
 * app es corta y tiene consecuencias de seguridad: conviene poder leerla
 * completa en una pantalla.
 */

const VERSION = "v1";
const CACHE_APP = `ctpatrol-app-${VERSION}`;

/** Lo mínimo para que la app arranque sin red. */
const PRECARGA = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

/** Orígenes que NUNCA se cachean. */
function esDinamico(url) {
  return (
    // Supabase: datos, auth y storage. Ver el comentario de arriba.
    url.hostname.endsWith(".supabase.co") ||
    // Server Actions y rutas de API de Next.
    url.pathname.startsWith("/api/") ||
    // El escaneo de documentos y el análisis con IA cuestan dinero por
    // llamada: servir una respuesta vieja daría datos de otro documento.
    url.pathname.includes("/_next/data/")
  );
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_APP)
      // `reload` fuerza a traerlos de red y no del caché HTTP, que podría
      // tener una versión vieja del arranque.
      .then((cache) =>
        cache.addAll(PRECARGA.map((u) => new Request(u, { cache: "reload" })))
      )
      // Activar de inmediato en vez de esperar a que cierren todas las
      // pestañas: en móvil la app vive en una sola y esa espera no llega.
      .then(() => self.skipWaiting())
      .catch(() => {
        // Si algo del precache falla, el service worker igual se instala.
        // Media caché es mejor que ninguna.
      })
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((llaves) =>
        Promise.all(
          llaves
            .filter((k) => k.startsWith("ctpatrol-") && k !== CACHE_APP)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;

  // Solo GET. Un POST cacheado sería una escritura fantasma.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || esDinamico(url)) return;

  // ── Navegación: red primero ─────────────────────────────────────────────
  // La app cambia y el inspector debe ver la versión nueva cuando hay señal.
  // Sin red, se sirve lo último que se guardó.
  if (request.mode === "navigate") {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_APP).then((c) => c.put(request, copia));
          return respuesta;
        })
        .catch(async () => {
          const cacheada = await caches.match(request);
          if (cacheada) return cacheada;
          // Cualquier ruta sin cachear cae al arranque: la app es una SPA
          // una vez cargada y sabe reencaminar.
          return (
            (await caches.match("/")) ??
            new Response(
              "<!doctype html><meta charset=utf-8><title>Sin conexión</title>" +
                "<p style='font:16px system-ui;padding:2rem'>Sin conexión. " +
                "Abre la app una vez con señal para poder usarla sin red.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        })
    );
    return;
  }

  // ── Estáticos: caché primero ────────────────────────────────────────────
  // Los archivos de /_next/static llevan hash en el nombre: si el contenido
  // cambia, cambia la URL. Servirlos de caché es seguro y evita descargarlos
  // otra vez en una red de patio.
  evento.respondWith(
    caches.match(request).then(
      (cacheada) =>
        cacheada ??
        fetch(request).then((respuesta) => {
          if (respuesta.ok && respuesta.type === "basic") {
            const copia = respuesta.clone();
            caches.open(CACHE_APP).then((c) => c.put(request, copia));
          }
          return respuesta;
        })
    )
  );
});
