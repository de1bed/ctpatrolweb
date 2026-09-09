/**
 * Convierte cualquier imagen del dispositivo a JPEG en base64.
 *
 * La galería de iPhone entrega HEIC con frecuencia. El servidor de OCR solo
 * acepta jpeg/png/webp, y canvas es el camino más fiable para normalizar
 * antes de enviar: si el navegador pudo mostrar la foto, puede reencodarla.
 */
export async function blobAJpegBase64(
  blob: Blob,
  calidad = 0.92
): Promise<string> {
  const bitmap = await obtenerBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo preparar la imagen para procesarla.");
    }
    ctx.drawImage(bitmap, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", calidad);
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      throw new Error("No se pudo convertir la imagen.");
    }
    return base64;
  } finally {
    bitmap.close();
  }
}

async function obtenerBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } catch {
      throw new Error(
        "No se pudo leer esta imagen. Prueba con una foto JPEG o PNG, o toma una nueva con la cámara."
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
