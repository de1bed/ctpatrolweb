import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claveDia,
  diasDelCalendario,
  mesDesdeParam,
  rangoVisible,
} from "./calendario";

describe("calendario", () => {
  it("septiembre 2026 cubre del lunes 31 de agosto al domingo 4 de octubre", () => {
    const mes = new Date(2026, 8, 1);
    const { desde, hasta } = rangoVisible(mes);
    assert.equal(claveDia(desde), "2026-08-31");
    assert.equal(claveDia(hasta), "2026-10-05");

    const dias = diasDelCalendario(mes);
    assert.equal(dias.length % 7, 0);
    assert.ok(dias.some((d) => claveDia(d) === "2026-09-30"));
    assert.ok(dias.some((d) => claveDia(d) === "2026-09-01"));
  });

  it("lee el mes de la URL y rechaza basura", () => {
    const mes = mesDesdeParam("2026-09");
    assert.equal(mes.getFullYear(), 2026);
    assert.equal(mes.getMonth(), 8);
    const hoy = mesDesdeParam("no-es-mes");
    const ahora = new Date();
    assert.equal(hoy.getFullYear(), ahora.getFullYear());
    assert.equal(hoy.getMonth(), ahora.getMonth());
  });
});
