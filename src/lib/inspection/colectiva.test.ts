import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firmasPendientes,
  ocupadosPorOtros,
  enVivo,
  otrosParticipantes,
  puedeCerrarColectiva,
  unidos,
  type Persona,
} from "./colectiva";

const ANA: Persona = { perfilId: "ana", nombre: "Ana", fases: 3, fotos: 10, pasoActual: null };
const BETO: Persona = { perfilId: "beto", nombre: "Beto", fases: 5, fotos: 2, pasoActual: "externa" };
const CARO: Persona = { perfilId: "caro", nombre: "Caro", fases: 0, fotos: 0, pasoActual: "interna" };
const DANI: Persona = { perfilId: "dani", nombre: "Dani", fases: 0, fotos: 1, pasoActual: null };

describe("inspección colectiva", () => {
  it("solo el encargado cierra; sin encargado, quien llegue", () => {
    assert.equal(puedeCerrarColectiva("ana", "ana"), true);
    assert.equal(puedeCerrarColectiva("ana", "beto"), false);
    assert.equal(puedeCerrarColectiva(null, "beto"), true);
  });

  it("se unieron todos menos el encargado, incluido quien ya está dentro", () => {
    assert.deepEqual(
      unidos([ANA, BETO, CARO, DANI], "ana").map((p) => p.nombre),
      ["Beto", "Caro", "Dani"]
    );
  });

  it("está en vivo mientras alguien captura", () => {
    assert.equal(enVivo([ANA, BETO]), true);
    assert.equal(enVivo([ANA, DANI]), false);
  });

  it("solo estar dentro de una fase no te hace participante", () => {
    assert.deepEqual(
      otrosParticipantes([ANA, BETO, CARO], "beto").map((p) => p.nombre),
      ["Ana"]
    );
  });

  it("tomar evidencia sí te hace participante", () => {
    assert.deepEqual(
      otrosParticipantes([BETO, DANI], "beto").map((p) => p.nombre),
      ["Dani"]
    );
  });

  it("piden firma todos los participantes menos el encargado, que cierra", () => {
    const pendientes = firmasPendientes([ANA, BETO, DANI], "beto", [
      { perfilId: "ana", firma: "data:..." },
      { perfilId: "dani", firma: "" },
    ]);
    assert.deepEqual(pendientes.map((p) => p.nombre), ["Dani"]);
  });

  it("avisa quién más está dentro de una fase", () => {
    assert.deepEqual(
      ocupadosPorOtros([ANA, BETO, CARO], "beto").map((p) => p.nombre),
      ["Caro"]
    );
  });
});
