import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describir, leerAnalisisGuardado, lineasResultadoIa } from "./bitacora";

const nombre = () => null;

describe("bitácora", () => {
  it("sigue describiendo el cierre como antes", () => {
    assert.equal(
      describir("completed", { aprobada: false }, nombre),
      "Cerró la inspección · rechazada"
    );
    assert.equal(describir("started", {}, nombre), "Inició la inspección");
  });

  it("dice si la IA vio bien, regular o mal el punto", () => {
    assert.equal(
      describir(
        "ai_analysis",
        {
          punto: "Puertas traseras",
          resultado: { sugerencia: "revisar" },
        },
        nombre
      ),
      "Usó IA en Puertas traseras · se ve regular"
    );
  });

  it("copia el resultado de la IA para poder leerlo después", () => {
    const lineas = lineasResultadoIa("ai_analysis", {
      resultado: {
        observacion: "La foto sirve. El piso se ve regular.",
        indicios: ["Remache nuevo"],
        calidadImagen: "buena",
        sugerencia: "revisar",
        confianza: 0.82,
      },
    });
    assert.equal(lineas[0], "La foto sirve. El piso se ve regular.");
    assert.match(lineas[1], /Remache nuevo/);
    assert.match(lineas[2], /Foto buena/);
    assert.match(lineas[2], /82%/);
  });

  it("lee un análisis guardado en la foto y descarta uno vacío", () => {
    assert.equal(leerAnalisisGuardado(null), null);
    const leido = leerAnalisisGuardado({
      observacion: "Se ve bien.",
      indicios: [],
      calidadImagen: "buena",
      problemaCalidad: null,
      sugerencia: "sin_novedad",
      confianza: 0.9,
      modelo: "gpt",
    });
    assert.equal(leido?.observacion, "Se ve bien.");
    assert.equal(leido?.sugerencia, "sin_novedad");
  });
});
