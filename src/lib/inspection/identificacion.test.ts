import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { esquemaConductor } from "./esquemas";
import { ultimaPorPunto } from "./identificacion";

/**
 * Volver a tomar la foto de una licencia o de unas placas deja la anterior
 * en el servidor. El reporte tiene que mostrar solo la vigente.
 */
describe("foto vigente por punto", () => {
  const media = [
    { id: "a", phase: "conductor", point_key: "licencia", captured_at: "2026-10-02T10:00:00+00:00" },
    { id: "b", phase: "conductor", point_key: "licencia", captured_at: "2026-10-02T10:05:00+00:00" },
    { id: "c", phase: "tractor", point_key: "placas", captured_at: "2026-10-02T09:00:00+00:00" },
    { id: "d", phase: "placas-remolque~2", point_key: "placas", captured_at: "2026-10-02T09:30:00+00:00" },
    { id: "e", phase: "tractor", point_key: null, captured_at: "2026-10-02T11:00:00+00:00" },
  ];
  const vigentes = ultimaPorPunto(media);

  it("se queda con la más reciente del mismo punto", () => {
    assert.equal(vigentes.get("conductor|licencia")?.id, "b");
  });

  it("no mezcla el mismo punto de pasos distintos", () => {
    assert.equal(vigentes.get("tractor|placas")?.id, "c");
    assert.equal(vigentes.get("placas-remolque~2|placas")?.id, "d");
  });

  it("ignora la evidencia sin punto", () => {
    assert.equal(vigentes.size, 3);
  });
});

/**
 * La fase de conductor ganó `fotoClave` en los adicionales. Las inspecciones
 * en curso guardaron sin ella y tienen que seguir validando.
 */
describe("esquema de conductor con foto de licencia", () => {
  it("acepta datos guardados antes de la foto", () => {
    const r = esquemaConductor.safeParse({
      conductorId: null,
      nombre: "JUAN PÉREZ",
      licencia: "ABC123",
      adicionales: [{ conductorId: null, nombre: "LUIS GÓMEZ", licencia: "" }],
    });
    assert.ok(r.success);
  });

  it("conserva la clave de la foto de cada adicional", () => {
    const r = esquemaConductor.safeParse({
      nombre: "JUAN PÉREZ",
      adicionales: [{ nombre: "LUIS GÓMEZ", fotoClave: "licencia-123" }],
    });
    assert.ok(r.success);
    assert.equal(r.data.adicionales[0].fotoClave, "licencia-123");
  });
});
