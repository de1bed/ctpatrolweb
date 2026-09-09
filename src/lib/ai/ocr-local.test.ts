import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extraerDeTexto } from "./ocr-local";

describe("extraerDeTexto", () => {
  it("lee un pedimento de 15 dígitos con espacios", () => {
    const r = extraerDeTexto("PEDIMENTO 24 43 3456 4001234 FACTURA A-991");
    assert.equal(r.pedimento?.replace(/\s/g, ""), "244334564001234");
    assert.ok(r.camposDudosos.includes("pedimento"));
    assert.equal(r.factura, "A-991");
  });

  it("no inventa campos si el texto no trae etiquetas", () => {
    const r = extraerDeTexto("hola mundo sin datos utiles aqui");
    assert.equal(r.factura, null);
    assert.equal(r.billOfLading, null);
    assert.ok(r.problema);
  });
});
