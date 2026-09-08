/**
 * Extrae el contenido de las guías del proyecto móvil anterior y lo genera
 * como TypeScript indexado por la clave de punto del catálogo nuevo.
 *
 * Se hace con un script y no a mano porque son 41 puntos × 4 campos: copiar
 * eso a mano garantiza al menos un error de transcripción, y aquí un error
 * significa darle al inspector la instrucción de otro punto.
 */
import { readFile, writeFile } from "node:fs/promises";

const ORIGEN =
  "C:/Users/david/Downloads/ctpatrol mobile/019a1a35-3add-75c6-943d-f72c614b1d78 (3)/019a1a35-3add-75c6-943d-f72c614b1d78/mobile/src/data/inspectionGuidelines.ts";

const CLAVES = {
  TRACTOR_INSPECTION_GUIDELINES: [
    "defensa", "llantas_rines", "caja_bateria", "puertas",
    "compartimiento_herramienta", "mecanismos_cerrado", "tanque_aire",
    "tanque_combustible", "cabina", "rompevientos_techo", "motor",
    "quinta_rueda_chasis", "mofle", "luces", "mangueras_frenos", "polveras",
  ],
  CONTAINER_INSPECTION_GUIDELINES: [
    "pared_frontal_ext", "pared_frontal_int", "paredes_laterales", "piso",
    "techo_externo", "puertas_ext_int", "chasis", "cubierta_ventilador",
    "compartimiento_quinta_rueda", "parachoques_trasero",
    "manijas_varillas_seguros", "soportes", "remaches", "llanta_refaccion",
    "luces_laterales_chasis", "direccionales_frenos_chasis", "llantas",
    "polveras_remolque", "placas",
  ],
  INTERNAL_INSPECTION_GUIDELINES: [
    "pared_frontal", "pared_izquierda", "pared_derecha", "piso_interior",
    "techo_interno", "puerta_ext_int",
  ],
};

const GRUPO = {
  TRACTOR_INSPECTION_GUIDELINES: "tractor",
  CONTAINER_INSPECTION_GUIDELINES: "exterior",
  INTERNAL_INSPECTION_GUIDELINES: "internos",
};

const fuente = await readFile(ORIGEN, "utf8");

/** Escapa comillas y barras para poder emitirlas dentro de un literal TS. */
const esc = (s) => s.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

let salida = `/**
 * Guías de inspección: qué buscar en cada punto y cómo fotografiarlo.
 *
 * GENERADO por scripts/portar-guias.mjs desde el proyecto móvil anterior.
 * Regenerar con: node scripts/portar-guias.mjs
 *
 * Es el conocimiento del oficio, escrito por quien sabe inspeccionar. La app
 * anterior lo mostraba junto a un diagrama con el punto resaltado, y es lo
 * que permite que un inspector nuevo sepa qué está viendo. Sin esto, la
 * pantalla de captura es una lista de nombres sin contexto.
 */

export type GuiaPunto = {
  /** Diagrama con este punto resaltado, en /public/guias. */
  diagrama: string;
  /** Qué verificar exactamente. */
  puntosClave: string[];
  /** Cómo tomar la evidencia. */
  recomendaciones: string[];
  /** Criterio C-TPAT del punto. */
  descripcion: string;
};

export const GUIAS: Record<string, GuiaPunto> = {
`;

let total = 0;

for (const [constante, claves] of Object.entries(CLAVES)) {
  const bloque = fuente.match(
    new RegExp(constante + "[^=]*=\\s*\\[(.*?)\\n\\];", "s")
  )[1];
  const objetos = bloque.split(/\n {2}\{/).slice(1);
  const grupo = GRUPO[constante];

  salida += `\n  // ── ${grupo} ──────────────────────────────────────────────\n`;

  objetos.forEach((obj, i) => {
    const clave = claves[i];
    if (!clave) return;

    const lista = (campo) => {
      const m = obj.match(new RegExp(campo + ":\\s*\\[(.*?)\\]", "s"));
      return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
    };
    const desc = (obj.match(/description:\s*"([^"]+)"/s) ?? [, ""])[1];

    salida += `  ${clave}: {\n`;
    salida += `    diagrama: "/guias/${grupo}/${clave}.webp",\n`;
    salida += `    puntosClave: [\n`;
    for (const p of lista("keyPoints")) salida += `      "${esc(p)}",\n`;
    salida += `    ],\n`;
    salida += `    recomendaciones: [\n`;
    for (const p of lista("recommendations")) salida += `      "${esc(p)}",\n`;
    salida += `    ],\n`;
    salida += `    descripcion: "${esc(desc)}",\n`;
    salida += `  },\n`;
    total++;
  });
}

salida += `};\n\nexport function guiaDe(clave: string): GuiaPunto | undefined {\n  return GUIAS[clave];\n}\n`;

await writeFile("src/lib/inspection/guias.ts", salida, "utf8");
console.log(`✓ ${total} guías portadas a src/lib/inspection/guias.ts`);
