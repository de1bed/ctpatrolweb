/**
 * Lectura local de documentos cuando OpenAI no está configurado.
 *
 * No sustituye al modelo de visión: extrae candidatos con OCR de dispositivo
 * y los marca todos como dudosos para que el inspector los confirme.
 */

export type LecturaLocal = {
  factura: string | null;
  billOfLading: string | null;
  pedimento: string | null;
  sellosFiscales: string | null;
  camposDudosos: string[];
  tipoDocumento: string | null;
  problema: string | null;
};

export async function extraerDocumentoLocal(blob: Blob): Promise<LecturaLocal> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa+eng");
  try {
    const { data } = await worker.recognize(blob);
    return extraerDeTexto(data.text ?? "");
  } finally {
    await worker.terminate();
  }
}

export function extraerDeTexto(texto: string): LecturaLocal {
  const limpio = texto.replace(/\s+/g, " ").trim();
  const vacio: LecturaLocal = {
    factura: null,
    billOfLading: null,
    pedimento: null,
    sellosFiscales: null,
    camposDudosos: [],
    tipoDocumento: null,
    problema: null,
  };

  if (limpio.length < 8) {
    return {
      ...vacio,
      problema:
        "No se leyó texto suficiente. Acerca más la cámara, mejora la luz o captura los datos a mano.",
    };
  }

  const pedimento =
    limpio.match(/\b\d{2}\s*\d{2}\s*\d{4}\s*\d{7}\b/)?.[0] ??
    limpio.match(/\b\d{15}\b/)?.[0] ??
    null;

  const factura =
    capturaEtiquetada(limpio, /(?:FACTURA|INVOICE|FOLIO)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{3,})/i) ??
    null;

  const billOfLading =
    capturaEtiquetada(
      limpio,
      /(?:B\/L|BILL OF LADING|\bBL\b|GUIA|CARTA PORTE)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{5,})/i
    ) ?? null;

  const sellosFiscales =
    capturaEtiquetada(
      limpio,
      /(?:SELLOS?\s+FISCALES?|SELLO|CANDADO|\bSEAL\b)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{3,})/i
    ) ?? null;

  const camposDudosos = [
    factura ? "factura" : null,
    billOfLading ? "billOfLading" : null,
    pedimento ? "pedimento" : null,
    sellosFiscales ? "sellosFiscales" : null,
  ].filter((c): c is string => Boolean(c));

  if (camposDudosos.length === 0) {
    return {
      ...vacio,
      problema:
        "Se leyó el documento pero no se identificaron factura, BL, pedimento ni sellos. Captúralos a mano o acerca el número a la cámara.",
    };
  }

  return {
    factura,
    billOfLading,
    pedimento,
    sellosFiscales,
    camposDudosos,
    tipoDocumento: "documento",
    problema: null,
  };
}

function capturaEtiquetada(texto: string, patron: RegExp): string | null {
  const m = texto.match(patron);
  return m?.[1]?.trim() || null;
}
