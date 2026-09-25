/** Qué número se está leyendo. Una foto, un campo. */
export const CAMPOS_DOCUMENTO = {
  factura: {
    etiqueta: "Factura",
    busca: "el número de factura comercial. Puede decir Factura, Invoice o Folio. Ignora pedimento, Bill of Lading y sellos.",
  },
  billOfLading: {
    etiqueta: "Bill of Lading",
    busca: "el número de Bill of Lading, BL, guía o carta porte. Ignora factura, pedimento y sellos.",
  },
  pedimento: {
    etiqueta: "Pedimento",
    busca: "el número de pedimento aduanal mexicano. Suele tener 15 dígitos, a menudo como 24 43 3456 4001234. Ignora factura, Bill of Lading y sellos.",
  },
  sellosFiscales: {
    etiqueta: "Sellos fiscales",
    busca: "el número del sello fiscal o candado oficial. Ignora factura, Bill of Lading y pedimento.",
  },
} as const;

export type CampoDocumento = keyof typeof CAMPOS_DOCUMENTO;

export type ObjetivoDocumento =
  | { campo: CampoDocumento }
  | { campo: "otro"; titulo: string };

export function textoObjetivo(objetivo: ObjetivoDocumento): {
  etiqueta: string;
  busca: string;
} {
  if (objetivo.campo === "otro") {
    const titulo = objetivo.titulo.trim();
    return {
      etiqueta: titulo,
      busca: `el número del documento llamado «${titulo}». Ignora cualquier otro número de la hoja.`,
    };
  }
  return CAMPOS_DOCUMENTO[objetivo.campo];
}

export function instruccionesDeCampo(objetivo: ObjetivoDocumento): string {
  const { etiqueta, busca } = textoObjetivo(objetivo);
  return `Lees UN solo dato de un documento de comercio exterior mexicano
para una inspección C-TPAT.

El inspector está llenando el campo «${etiqueta}».
Busca únicamente ${busca}

Devuelve solo ese número en el campo "valor".

Reglas estrictas:
- Si ese dato NO aparece, devuelve valor null. NO inventes ni uses otro número
  de la hoja para llenarlo. Un número del campo equivocado es peor que vacío.
- Si dudas de un carácter (borroso, cortado, 0/O, 1/7), devuelve el valor
  igual y pon dudoso en true.
- Conserva guiones, espacios y ceros a la izquierda.
- Si la imagen está muy borrosa, muy oscura o no es un documento, valor null
  y explica en "problema" qué pasó.
- Responde en español.`;
}
