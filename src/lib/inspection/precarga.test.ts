import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { armarPrecarga } from "./precarga";
import { previo } from "../../components/inspection/fases/tipos";

/**
 * El admin escribe aquí; el inspector lee con `previo(...)` en cada fase.
 * Si se desincronizan las claves, la precarga "está en la base" y nadie la ve.
 */
describe("precarga del admin → fases del inspector", () => {
  const data = armarPrecarga({
    clienteId: "11111111-1111-1111-1111-111111111111",
    clienteNombre: "Fletes del Norte",
    tractorId: "22222222-2222-2222-2222-222222222222",
    tractorNumero: "T-18",
    tractorPlacas: "ABC-12-34",
    conductorId: "33333333-3333-3333-3333-333333333333",
    conductorNombre: "Juan Pérez",
    conductorLicencia: "NLM123",
    tipoTransporte: "caja",
  });

  it("el transportista aparece con las claves de FaseCliente", () => {
    const fase = data.cliente as Record<string, unknown>;
    assert.equal(previo(fase, "clienteNombre", ""), "Fletes del Norte");
    assert.equal(
      previo<string | null>(fase, "clienteId", null),
      "11111111-1111-1111-1111-111111111111"
    );
  });

  it("la unidad aparece con las claves de FaseTractor (numero, no tractorNumero)", () => {
    const fase = data.tractor as Record<string, unknown>;
    assert.equal(previo(fase, "numero", ""), "T-18");
    assert.equal(previo(fase, "placas", ""), "ABC-12-34");
  });

  it("el conductor aparece con las claves de FaseConductor (nombre, no conductorNombre)", () => {
    const fase = data.conductor as Record<string, unknown>;
    assert.equal(previo(fase, "nombre", ""), "Juan Pérez");
    assert.equal(previo(fase, "licencia", ""), "NLM123");
  });

  it("el tipo de transporte aparece con la clave de FaseTipoTransporte", () => {
    const fase = data["tipo-transporte"] as Record<string, unknown>;
    assert.equal(previo(fase, "tipo", null), "caja");
    assert.equal(previo(fase, "esFull", true), false);
  });

  it("sin datos no ensucia el JSON", () => {
    assert.deepEqual(armarPrecarga({}), {});
  });
});
