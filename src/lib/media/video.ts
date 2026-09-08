"use client";

/**
 * Grabación de clips cortos de evidencia.
 *
 * El protocolo VVTT de sellos pide observar, verificar el número, JALAR y
 * GIRAR. Las dos últimas son maniobras: una foto no prueba que se hicieron.
 * De ahí el clip de 4 a 8 segundos, igual que en la app anterior.
 *
 * A diferencia de la foto, aquí no se pueden quemar los metadatos en la
 * imagen sin recodificar el video —caro y lento en un teléfono—. Se guardan
 * como columnas y en el nombre del archivo, y el reporte los imprime junto
 * al clip.
 */

export const DURACION_MINIMA = 4;
export const DURACION_MAXIMA = 8;

export type VideoCapturado = {
  blob: Blob;
  mimeType: string;
  duracionSegundos: number;
};

/**
 * Elige un contenedor que el navegador sepa grabar.
 *
 * Safari solo produce MP4; Chrome y Firefox prefieren WebM. Pedir un tipo
 * que el navegador no soporta hace que MediaRecorder falle al construirse,
 * así que se prueba en orden y se cae al que haya.
 */
function elegirMimeType(): string {
  const candidatos = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const tipo of candidatos) {
    if (MediaRecorder.isTypeSupported(tipo)) return tipo;
  }
  return "";
}

export type ControlGrabacion = {
  detener: () => Promise<VideoCapturado>;
  cancelar: () => void;
};

/**
 * Arranca la grabación y devuelve los controles para terminarla.
 *
 * El corte por duración máxima lo hace el llamador con su propio temporizador:
 * así la interfaz puede mostrar la cuenta regresiva usando el mismo reloj y
 * no se desincroniza con lo que realmente se está grabando.
 */
export function grabar(stream: MediaStream): ControlGrabacion {
  const mimeType = elegirMimeType();
  const grabadora = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    // 2.5 Mbps: suficiente para distinguir un sello y su número, y lo bastante
    // ligero para subirse por la red de un patio.
    videoBitsPerSecond: 2_500_000,
  });

  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => {
    if (e.data.size > 0) trozos.push(e.data);
  };

  const inicio = Date.now();
  // Trozos de 1 s: si el navegador se cierra a media grabación, se conserva
  // lo grabado hasta el último trozo en vez de perderlo todo.
  grabadora.start(1000);

  return {
    detener: () =>
      new Promise<VideoCapturado>((resolver, rechazar) => {
        grabadora.onstop = () => {
          const tipo = grabadora.mimeType || mimeType || "video/webm";
          const blob = new Blob(trozos, { type: tipo });

          if (blob.size === 0) {
            rechazar(new Error("La grabación salió vacía. Intenta de nuevo."));
            return;
          }

          resolver({
            blob,
            mimeType: tipo,
            duracionSegundos: Math.round((Date.now() - inicio) / 100) / 10,
          });
        };

        if (grabadora.state !== "inactive") grabadora.stop();
      }),

    cancelar: () => {
      if (grabadora.state !== "inactive") grabadora.stop();
      trozos.length = 0;
    },
  };
}

/** Extensión de archivo según el contenedor, para nombrar bien en Storage. */
export function extensionDe(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}
