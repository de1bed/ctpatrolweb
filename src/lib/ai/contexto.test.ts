import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { notaDelPunto } from "./contexto";

describe("notaDelPunto", () => {
  it("saca la nota del punto si existe", () => {
    assert.equal(
      notaDelPunto(
        { "tractor-visual": { puntos: { defensa: { nota: "  Soldadura rara  " } } } },
        "tractor-visual",
        "defensa"
      ),
      "Soldadura rara"
    );
  });

  it("devuelve null si no hay nota", () => {
    assert.equal(
      notaDelPunto({ "tractor-visual": { puntos: { defensa: { calificacion: "bueno" } } } }, "tractor-visual", "defensa"),
      null
    );
  });

  it("no se inventa notas de otro punto", () => {
    assert.equal(
      notaDelPunto(
        { "tractor-visual": { puntos: { defensa: { nota: "x" } } } },
        "tractor-visual",
        "motor"
      ),
      null
    );
  });
});
