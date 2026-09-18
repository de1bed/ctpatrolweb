import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estadoDelMiembro } from "./equipo";

describe("estadoDelMiembro", () => {
  it("quien ya entró está en el equipo", () => {
    assert.equal(
      estadoDelMiembro({
        activo: true,
        ultimaEntrada: "2026-09-18T21:00:00Z",
        correoEnviado: true,
      }),
      "en_equipo"
    );
  });

  it("sin entrar y con correo sale invitación enviada", () => {
    assert.equal(
      estadoDelMiembro({
        activo: true,
        ultimaEntrada: null,
        correoEnviado: true,
      }),
      "invitacion_enviada"
    );
  });

  it("sin entrar y sin correo avisa que no salió", () => {
    assert.equal(
      estadoDelMiembro({
        activo: true,
        ultimaEntrada: null,
        correoEnviado: false,
      }),
      "correo_no_salio"
    );
  });

  it("fuera del equipo gana aunque haya entrado antes", () => {
    assert.equal(
      estadoDelMiembro({
        activo: false,
        ultimaEntrada: "2026-09-18T21:00:00Z",
        correoEnviado: true,
      }),
      "fuera"
    );
  });
});
