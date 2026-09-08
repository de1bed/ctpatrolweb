/**
 * Genera los PNG del manifiesto a partir de public/icons/icon.svg.
 *
 * Se versiona el script y no solo los PNG: el día que cambie el logo, se
 * corre `npm run icons` y salen los cuatro tamaños consistentes, en vez de
 * que alguien exporte a mano y quede uno desalineado.
 *
 * La versión "maskable" lleva 20% de margen porque Android recorta el ícono
 * a la forma del launcher. Sin ese aire, el escudo sale mochado en los
 * teléfonos que usan máscara circular.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "icons");
const svg = await readFile(join(destino, "icon.svg"));

await mkdir(destino, { recursive: true });

/** Íconos normales: el arte ocupa todo el lienzo. */
for (const tamano of [192, 512]) {
  const png = await sharp(svg, { density: 384 })
    .resize(tamano, tamano)
    .png()
    .toBuffer();
  await writeFile(join(destino, `icon-${tamano}.png`), png);
  console.log(`✓ icon-${tamano}.png`);
}

/** Maskable: mismo arte, encogido, sobre fondo de marca. */
const LADO = 512;
const AREA_SEGURA = Math.round(LADO * 0.6); // 20% de margen por lado
const arte = await sharp(svg, { density: 384 })
  .resize(AREA_SEGURA, AREA_SEGURA)
  .png()
  .toBuffer();

const maskable = await sharp({
  create: {
    width: LADO,
    height: LADO,
    channels: 4,
    background: "#1e40af",
  },
})
  .composite([{ input: arte, gravity: "centre" }])
  .png()
  .toBuffer();

await writeFile(join(destino, "icon-maskable-512.png"), maskable);
console.log("✓ icon-maskable-512.png");

/** Apple no lee el manifiesto: usa <link rel="apple-touch-icon">, 180px. */
const apple = await sharp(svg, { density: 384 })
  .resize(180, 180)
  .flatten({ background: "#1e40af" })
  .png()
  .toBuffer();
await writeFile(join(raiz, "src", "app", "apple-icon.png"), apple);
console.log("✓ apple-icon.png");
