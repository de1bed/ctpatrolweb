import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { esquemaFirmas, MAX_FIRMAS_ADICIONALES } from "./esquemas";

const BASE = {
  inspector: { nombre: "Caseta norte", firma: "data:image/png;base64,AAA" },
  conductor: { nombre: "Juan Pérez", firma: "data:image/png;base64,BBB" },
};

const ADICIONAL = {
  cargo: "Supervisor",
  nombre: "Ana López",
  firma: "data:image/png;base64,CCC",
};

/**
 * Las firmas adicionales llegaron con expedientes ya cerrados en producción.
 * Lo que se firmó antes tiene que seguir siendo válido.
 */
describe("firmas adicionales", () => {
  it("las firmas de antes, sin adicionales, siguen siendo válidas", () => {
    const r = esquemaFirmas.safeParse(BASE);
    assert.ok(r.success);
    assert.deepEqual(r.data.adicionales, []);
  });

  it("acepta firmas adicionales completas", () => {
    const r = esquemaFirmas.safeParse({ ...BASE, adicionales: [ADICIONAL] });
    assert.ok(r.success);
    assert.equal(r.data.adicionales[0].cargo, "Supervisor");
  });

  it("rechaza una firma adicional sin cargo, nombre o trazo", () => {
    const incompletas = [
      { ...ADICIONAL, cargo: "  " },
      { ...ADICIONAL, nombre: "  " },
      { ...ADICIONAL, firma: "" },
    ];
    for (const adicional of incompletas) {
      const r = esquemaFirmas.safeParse({ ...BASE, adicionales: [adicional] });
      assert.ok(!r.success, `debió rechazar ${JSON.stringify(adicional)}`);
    }
  });

  it("respeta el tope de firmas adicionales", () => {
    const muchas = Array.from({ length: MAX_FIRMAS_ADICIONALES + 1 }, () => ADICIONAL);
    assert.ok(!esquemaFirmas.safeParse({ ...BASE, adicionales: muchas }).success);
  });
});
