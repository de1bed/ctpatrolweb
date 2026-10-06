import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aZona, desdeZona, formatoEnZona, zonaValida, ZONA_POR_DEFECTO } from "./zona";

/**
 * Casos reales: la inspección CRISOS001-260918-003 se programó para las 9:00
 * de México y quedó guardada como 15:00 UTC. El servidor la mostraba a las 15.
 */
describe("zona horaria", () => {
  it("muestra en hora de México lo guardado en UTC", () => {
    assert.equal(
      formatoEnZona("2026-09-18T15:00:00+00:00", "HH:mm", "America/Mexico_City"),
      "09:00"
    );
  });

  it("una inspección de las 19:00 no se pasa al día siguiente", () => {
    // 19:00 en México = 01:00 UTC del día siguiente.
    assert.equal(
      formatoEnZona("2026-10-06T01:00:00Z", "yyyy-MM-dd HH:mm", "America/Mexico_City"),
      "2026-10-05 19:00"
    );
  });

  it("respeta otras zonas de la frontera", () => {
    assert.equal(formatoEnZona("2026-10-05T18:00:00Z", "HH:mm", "America/Tijuana"), "11:00");
  });

  it("de la hora de pared al instante, y de regreso", () => {
    const pared = new Date(2026, 9, 5, 0, 0, 0); // 5 oct 00:00
    const instante = desdeZona(pared, "America/Mexico_City");
    assert.equal(instante.toISOString(), "2026-10-05T06:00:00.000Z");
    assert.equal(aZona(instante, "America/Mexico_City").getTime(), pared.getTime());
  });

  it("cruza el cambio de horario de EE. UU. sin perder la hora", () => {
    // Tijuana cambia el 1 de noviembre de 2026.
    const antes = desdeZona(new Date(2026, 9, 31, 12, 0), "America/Tijuana");
    const despues = desdeZona(new Date(2026, 10, 2, 12, 0), "America/Tijuana");
    assert.equal(antes.toISOString(), "2026-10-31T19:00:00.000Z");
    assert.equal(despues.toISOString(), "2026-11-02T20:00:00.000Z");
  });

  it("ignora zonas inválidas y decodifica la cookie", () => {
    assert.equal(zonaValida("Marte/Base"), ZONA_POR_DEFECTO);
    assert.equal(zonaValida(undefined), ZONA_POR_DEFECTO);
    assert.equal(zonaValida("America%2FMonterrey"), "America/Monterrey");
  });
});

describe("hora de entrada tecleada", () => {
  it("se guarda como hora del inspector, no del servidor", async () => {
    const { horaLocalAInstante } = await import("./inspection/esquemas");
    // Caso real: CRISOS002-261006-001, inspector en UTC-7, tecleó 21:40.
    assert.equal(
      horaLocalAInstante("2026-10-05T21:40", "America/Tijuana"),
      "2026-10-06T04:40:00.000Z"
    );
  });
});
