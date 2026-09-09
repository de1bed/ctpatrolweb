"use client";

/**
 * Captura de foto con metadatos quemados en la imagen.
 *
 * ── Por qué quemarlos ───────────────────────────────────────────────────────
 *
 * Los datos EXIF se pueden editar con cualquier herramienta gratuita, y al
 * recomprimir una imagen se pierden solos. Una inspección C-TPAT es evidencia
 * ante aduana: la fecha, la hora y las coordenadas tienen que ir dentro de los
 * píxeles, donde alterarlas deja rastro visible.
 *
 * Además se guardan como columnas en la base, así que hay dos copias
 * independientes que se pueden contrastar.
 */

export type MetadatosCaptura = {
  capturadaEn: string;
  latitud: number | null;
  longitud: number | null;
};

export type FotoCapturada = {
  blob: Blob;
  ancho: number;
  alto: number;
  mimeType: string;
};

/** Lado mayor de la foto guardada. */
const LADO_MAXIMO = 1600;

/** Calidad JPEG. 0.82 es donde deja de notarse la pérdida y el peso ya bajó mucho. */
const CALIDAD = 0.82;

function dosDigitos(n: number) {
  return String(n).padStart(2, "0");
}

export function formatearMomento(iso: string): string {
  const d = new Date(iso);
  return (
    `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:${dosDigitos(d.getSeconds())}`
  );
}

export function formatearCoordenadas(
  lat: number | null,
  lng: number | null
): string {
  if (lat == null || lng == null) return "GPS no disponible";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Dibuja el video en un canvas, le quema los metadatos y devuelve un JPEG.
 *
 * Se reescala al vuelo: una cámara de teléfono entrega 12 megapíxeles y una
 * foto así pesa varios MB. Con 41 fotos por inspección eso es medio giga que
 * hay que subir por una red de patio. A 1600px del lado mayor el detalle
 * necesario se conserva y el peso baja a unos 300 KB.
 */
export async function capturarDeVideo(
  video: HTMLVideoElement,
  metadatos: MetadatosCaptura,
  etiquetaPunto: string
): Promise<FotoCapturada> {
  const anchoFuente = video.videoWidth;
  const altoFuente = video.videoHeight;

  if (!anchoFuente || !altoFuente) {
    throw new Error("La cámara todavía no entrega imagen.");
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(anchoFuente, altoFuente));
  const ancho = Math.round(anchoFuente * escala);
  const alto = Math.round(altoFuente * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo de la imagen.");

  ctx.drawImage(video, 0, 0, ancho, alto);
  dibujarMetadatos(ctx, ancho, alto, metadatos, etiquetaPunto);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD)
  );

  if (!blob) throw new Error("No se pudo generar la imagen.");

  return { blob, ancho, alto, mimeType: "image/jpeg" };
}

/**
 * Franja de metadatos al pie de la imagen.
 *
 * Va sobre un fondo negro semitransparente de borde a borde, no como texto
 * suelto: sobre una foto de un chasis oscuro o una caja blanca al sol, un
 * texto sin fondo se vuelve ilegible en una de las dos.
 */
function dibujarMetadatos(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  metadatos: MetadatosCaptura,
  etiquetaPunto: string
) {
  // Todo se escala con el ancho para que se vea igual en cualquier cámara.
  const escala = ancho / 1600;
  const tamanoTexto = Math.max(14, Math.round(26 * escala));
  const margen = Math.round(20 * escala);
  const interlinea = Math.round(tamanoTexto * 1.35);

  const lineas = [
    etiquetaPunto,
    formatearMomento(metadatos.capturadaEn),
    formatearCoordenadas(metadatos.latitud, metadatos.longitud),
  ].filter(Boolean);

  const altoFranja = interlinea * lineas.length + margen * 1.5;

  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(0, alto - altoFranja, ancho, altoFranja);

  ctx.font = `600 ${tamanoTexto}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";

  // Sombra fina: si el fondo semitransparente cae sobre una zona muy clara,
  // el blanco solo no basta.
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = Math.max(2, Math.round(3 * escala));

  let y = alto - altoFranja + margen * 0.75;
  for (const linea of lineas) {
    ctx.fillText(linea, margen, y);
    y += interlinea;
  }

  ctx.restore();
}

/**
 * Pide la cámara trasera.
 *
 * `facingMode: environment` es una preferencia, no una orden: en una laptop
 * no hay trasera y el navegador entrega la que haya. Por eso no se trata como
 * error si devuelve la frontal.
 */
/**
 * Quema metadatos sobre una imagen ya tomada (cámara nativa o galería).
 *
 * Es el camino de respaldo cuando getUserMedia no abre: en muchos teléfonos
 * el `<input capture>` sí funciona, y sin este paso esas fotos llegarían
 * sin fecha ni GPS impresos.
 */
export async function capturarDeArchivo(
  archivo: Blob,
  metadatos: MetadatosCaptura,
  etiquetaPunto: string
): Promise<FotoCapturada> {
  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
  const ancho = Math.round(mapa.width * escala);
  const alto = Math.round(mapa.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    mapa.close();
    throw new Error("No se pudo preparar el lienzo de la imagen.");
  }

  ctx.drawImage(mapa, 0, 0, ancho, alto);
  mapa.close();
  dibujarMetadatos(ctx, ancho, alto, metadatos, etiquetaPunto);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD)
  );

  if (!blob) throw new Error("No se pudo generar la imagen.");

  return { blob, ancho, alto, mimeType: "image/jpeg" };
}

export async function abrirCamara(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Este navegador no permite usar la cámara. Prueba con Chrome o Safari actualizado."
    );
  }

  const ideal = {
    video: {
      facingMode: { ideal: "environment" as const },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(ideal);
  } catch {
    // En laptops, iOS antiguos o cuando `environment` no existe, el pedido
    // estricto falla. Cualquier cámara sirve: lo importante es no bloquear.
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

/** Traduce los errores de getUserMedia a algo accionable. */
export function explicarErrorCamara(error: unknown): string {
  if (!(error instanceof Error)) return "No se pudo abrir la cámara.";

  switch (error.name) {
    case "NotAllowedError":
      return "Permiso denegado. Habilita la cámara para este sitio en los ajustes del navegador.";
    case "NotFoundError":
      return "No se encontró ninguna cámara en este dispositivo.";
    case "NotReadableError":
      return "Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.";
    case "OverconstrainedError":
      return "La cámara no soporta la configuración pedida.";
    case "SecurityError":
      // Causa típica en producción: servir por HTTP en vez de HTTPS.
      return "La cámara requiere una conexión segura (HTTPS).";
    default:
      return error.message || "No se pudo abrir la cámara.";
  }
}
