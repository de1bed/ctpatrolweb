import "server-only";

import sharp from "sharp";

/**
 * Prepara una foto para visión.
 *
 * OpenAI cobra por teselas de 512 px cuando `detail: high`. Mandar el JPEG
 * original (a veces 4000 px) multiplica el costo sin ganar detalle útil:
 * una soldadura se ve igual a 1280 que a 4000, y un dígito de pedimento
 * sigue legible a 1600.
 *
 * Si sharp falla (formato raro), se manda el original: peor de tokens que
 * no analizar.
 */
export async function prepararParaVision(
  archivo: Buffer,
  mimeType: string,
  maxLado: number
): Promise<{ base64: string; mimeType: string }> {
  try {
    const listo = await sharp(archivo)
      .rotate()
      .resize(maxLado, maxLado, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    return { base64: listo.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return { base64: archivo.toString("base64"), mimeType };
  }
}

/** Foto de un punto: detalle de soldadura, no megapíxeles. */
export const LADO_VISION_PUNTO = 1280;

/** Documento: dígitos chicos de pedimento. Un poco más de lado. */
export const LADO_VISION_DOCUMENTO = 1600;
