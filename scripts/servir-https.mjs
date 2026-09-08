/**
 * Sirve el build de PRODUCCIÓN por HTTPS en la red local.
 *
 * ── Para qué ────────────────────────────────────────────────────────────────
 *
 * `next dev --experimental-https` sirve el modo desarrollo. Sirve para probar
 * la cámara, pero no es lo que va a correr en producción: el service worker
 * no se registra, no hay minificación y el rendimiento es otro.
 *
 * Esto levanta `next start` (el build real) detrás de un proxy HTTPS que usa
 * los certificados que ya generó `next dev --experimental-https`. Así se
 * puede probar desde un teléfono exactamente lo que se va a desplegar,
 * incluido el arranque sin señal.
 *
 * Es un proxy de veinte líneas con los módulos que ya trae Node: meter una
 * dependencia para esto sería más código que el propio proxy.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

const RAIZ = process.cwd();
const PUERTO_HTTPS = 3443;
const PUERTO_INTERNO = 3101;

const cert = join(RAIZ, "certificates", "localhost.pem");
const llave = join(RAIZ, "certificates", "localhost-key.pem");

if (!existsSync(cert) || !existsSync(llave)) {
  console.error(
    "\nFaltan los certificados locales.\n" +
      "Genéralos una vez con:  npm run dev:https  (ciérralo con Ctrl+C)\n"
  );
  process.exit(1);
}

/** IP en la red local, para poder entrar desde el teléfono. */
function ipLocal() {
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const i of interfaces ?? []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return "localhost";
}

// `next start` escucha solo en el puerto interno; nadie entra ahí directo.
//
// `shell: true` es obligatorio en Windows: npx es un .cmd, y desde Node 20
// spawn se niega a ejecutar archivos por lotes sin shell (falla con EINVAL).
const next = spawn("npx next start -p " + PUERTO_INTERNO, {
  cwd: RAIZ,
  stdio: ["ignore", "inherit", "inherit"],
  shell: true,
});

next.on("exit", (codigo) => process.exit(codigo ?? 0));

const servidor = https.createServer(
  { cert: readFileSync(cert), key: readFileSync(llave) },
  (peticion, respuesta) => {
    const proxy = http.request(
      {
        host: "127.0.0.1",
        port: PUERTO_INTERNO,
        path: peticion.url,
        method: peticion.method,
        headers: {
          ...peticion.headers,
          // Next necesita saber que la petición original venía por HTTPS para
          // marcar las cookies como seguras y construir bien las URLs.
          "x-forwarded-proto": "https",
        },
      },
      (respuestaInterna) => {
        respuesta.writeHead(respuestaInterna.statusCode ?? 502, respuestaInterna.headers);
        respuestaInterna.pipe(respuesta);
      }
    );

    proxy.on("error", () => {
      // Pasa mientras `next start` todavía está arrancando.
      respuesta.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      respuesta.end("El servidor todavía está arrancando. Recarga en unos segundos.");
    });

    peticion.pipe(proxy);
  }
);

servidor.listen(PUERTO_HTTPS, "0.0.0.0", () => {
  console.log(`
  CTPatrol · build de producción

  En esta computadora:  https://localhost:${PUERTO_HTTPS}
  Desde el teléfono:    https://${ipLocal()}:${PUERTO_HTTPS}

  El certificado es local, así que el teléfono va a mostrar una advertencia
  la primera vez. Acéptala ("Avanzado" → "Continuar"): a partir de ahí la
  cámara y el GPS funcionan.
`);
});

for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => {
    next.kill();
    servidor.close(() => process.exit(0));
  });
}
