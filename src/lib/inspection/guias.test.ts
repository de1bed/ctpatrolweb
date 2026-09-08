import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { GUIAS } from "./guias";
import { PUNTOS_POR_GRUPO } from "./puntos";

/**
 * Integridad de las guías.
 *
 * Un punto sin guía deja al inspector sin saber qué buscar; un diagrama que
 * no existe deja un hueco roto en la pantalla. Las dos cosas se detectan
 * aquí y no en el patio.
 */

const PUBLICO = join(process.cwd(), "public");

describe("guías de inspección", () => {
  it("todo punto del catálogo tiene guía", () => {
    const sinGuia: string[] = [];

    for (const [grupo, puntos] of Object.entries(PUNTOS_POR_GRUPO)) {
      for (const punto of puntos) {
        if (!GUIAS[punto.clave]) sinGuia.push(`${grupo}/${punto.clave}`);
      }
    }

    assert.deepEqual(sinGuia, [], `puntos sin guía: ${sinGuia.join(", ")}`);
  });

  it("toda guía tiene contenido, no está vacía", () => {
    for (const [clave, guia] of Object.entries(GUIAS)) {
      assert.ok(guia.puntosClave.length > 0, `${clave}: sin puntos clave`);
      assert.ok(guia.recomendaciones.length > 0, `${clave}: sin recomendaciones`);
      assert.ok(guia.descripcion.length > 20, `${clave}: descripción muy corta`);
    }
  });

  it("cada diagrama existe en disco", () => {
    const faltantes: string[] = [];

    for (const [clave, guia] of Object.entries(GUIAS)) {
      // La ruta es pública (/guias/...), así que en disco cuelga de /public.
      const ruta = join(PUBLICO, guia.diagrama);
      if (!existsSync(ruta)) faltantes.push(`${clave} → ${guia.diagrama}`);
    }

    assert.deepEqual(faltantes, [], `diagramas faltantes:\n${faltantes.join("\n")}`);
  });

  it("no sobran guías de puntos que ya no existen", () => {
    const clavesValidas = new Set(
      Object.values(PUNTOS_POR_GRUPO).flatMap((ps) => ps.map((p) => p.clave))
    );

    const huerfanas = Object.keys(GUIAS).filter((c) => !clavesValidas.has(c));

    assert.deepEqual(
      huerfanas,
      [],
      `guías sin punto correspondiente: ${huerfanas.join(", ")}`
    );
  });
});
