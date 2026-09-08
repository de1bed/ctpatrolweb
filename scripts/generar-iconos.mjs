/**
 * Genera todos los tamaños de ícono a partir de brand/logo-fuente.png.
 *
 * La fuente es el logo original de CTPatrol (1024×1024, tráiler con escudo
 * sobre azul de marca), heredado de la app móvil.
 *
 * Se versiona el script y no solo los PNG: el día que cambie el logo se
 * corre `npm run icons` y salen todos los tamaños consistentes, en lugar de
 * que alguien exporte a mano y quede uno desalineado.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fuente = join(raiz, "brand", "logo-fuente.png");
const destino = join(raiz, "public", "icons");

/** Azul de marca, muestreado del logo original. */
const AZUL_MARCA = "#0c77bd";

await mkdir(destino, { recursive: true });

/**
 * Íconos normales: el arte ocupa todo el lienzo.
 * 192 y 512 son los que pide el manifiesto; 256 lo usa la propia interfaz
 * (login, riel lateral) sin tener que bajar el de 512.
 */
for (const lado of [192, 256, 512]) {
  const png = await sharp(fuente)
    .resize(lado, lado, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(destino, `icon-${lado}.png`), png);
  console.log(`✓ icon-${lado}.png`);
}

/**
 * Maskable: Android recorta el ícono a la forma del launcher (círculo,
 * cuadrado redondeado, gota). El arte se encoge al 60% y se centra sobre el
 * azul de marca; sin ese margen, al tráiler le cortan las llantas.
 */
const LADO = 512;
const arte = await sharp(fuente)
  .resize(Math.round(LADO * 0.6), Math.round(LADO * 0.6), { fit: "contain" })
  .png()
  .toBuffer();

const maskable = await sharp({
  create: { width: LADO, height: LADO, channels: 4, background: AZUL_MARCA },
})
  .composite([{ input: arte, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(join(destino, "icon-maskable-512.png"), maskable);
console.log("✓ icon-maskable-512.png");

/**
 * Apple no lee el manifiesto: usa <link rel="apple-touch-icon">, 180px.
 * Next lo publica solo si el archivo se llama apple-icon.png y vive en app/.
 */
const apple = await sharp(fuente)
  .resize(180, 180, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(raiz, "src", "app", "apple-icon.png"), apple);
console.log("✓ apple-icon.png");

/** Favicon de la pestaña. Next lo toma de app/icon.png. */
const favicon = await sharp(fuente)
  .resize(64, 64, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(raiz, "src", "app", "icon.png"), favicon);
console.log("✓ icon.png (favicon)");
