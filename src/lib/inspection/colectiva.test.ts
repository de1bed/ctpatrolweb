import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firmasPendientes,
  ocupadosPorOtros,
  otrosParticipantes,
  quienCierra,
  type Persona,
} from "./colectiva";

const ANA: Persona = { perfilId: "ana", nombre: "Ana", fases: 3, fotos: 10, pasoActual: null };
const BETO: Persona = { perfilId: "beto", nombre: "Beto", fases: 5, fotos: 2, pasoActual: "externa" };
const CARO: Persona = { perfilId: "caro", nombre: "Caro", fases: 0, fotos: 0, pasoActual: "interna" };
const DANI: Persona = { perfilId: "dani", nombre: "Dani", fases: 0, fotos: 1, pasoActual: null };

describe("inspección colectiva", () => {
  it("se firma en el teléfono de quien hizo más fases", () => {
    assert.equal(quienCierra([ANA, BETO, CARO])?.nombre, "Beto");
  });

  it("en empate de fases decide quien tomó más fotos", () => {
    assert.equal(quienCierra([{ ...ANA, fases: 5 }, BETO])?.nombre, "Ana");
  });

  it("solo estar dentro de una fase no te hace participante", () => {
    assert.equal(quienCierra([CARO]), null);
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

  it("piden firma todos los participantes menos quien cierra", () => {
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
