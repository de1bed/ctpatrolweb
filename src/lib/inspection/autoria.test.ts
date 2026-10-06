import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  estamparAutoria,
  leerAutoriaFase,
  leerAutoriaPunto,
  leerTocados,
  type Autor,
} from "./autoria";

const ana: Autor = { id: "ana", nombre: "Ana", en: "2026-10-05T10:00:00.000Z" };
const beto: Autor = { id: "beto", nombre: "Beto", en: "2026-10-05T10:30:00.000Z" };

const catalogo = [
  { clave: "p1", nombre: "Defensa" },
  { clave: "p2", nombre: "Llantas" },
  { clave: "p3", nombre: "Puertas" },
];

const bueno = { calificacion: "bueno", nota: "", noAplica: false };

describe("autoría de puntos", () => {
  const primera = estamparAutoria({
    anterior: undefined,
    nuevo: { puntos: { p1: bueno, p2: bueno, p3: { calificacion: "malo", nota: "Golpe", noAplica: false } } },
    tocados: [],
    autor: ana,
    puntosCatalogo: catalogo,
  });

  it("la primera captura deja a su autor en cada punto y en la fase", () => {
    const puntos = primera.datos.puntos as Record<string, unknown>;
    for (const clave of ["p1", "p2", "p3"]) {
      assert.equal(leerAutoriaPunto(puntos[clave])?.editadoPor, "ana");
    }
    const fase = leerAutoriaFase(primera.datos);
    assert.equal(fase?.primera?.id, "ana");
    assert.equal(fase?.ultima.id, "ana");
    assert.equal(primera.edicion, false);
  });

  it("en la primera captura solo los hallazgos van a la bitácora", () => {
    assert.equal(primera.cambios.length, 1);
    assert.deepEqual(primera.resumen, { bueno: 2, malo: 1 });
    const c = primera.cambios[0];
    assert.equal(c.tipo === "punto" && c.nombre, "3. Puertas");
  });

  const edicion = estamparAutoria({
    anterior: primera.datos,
    nuevo: {
      puntos: {
        p1: bueno,
        p2: { calificacion: "regular", nota: "Desgaste", noAplica: false },
        p3: { calificacion: "malo", nota: "Golpe", noAplica: false },
      },
    },
    tocados: ["p1"],
    autor: beto,
    puntosCatalogo: catalogo,
  });
  const puntos = edicion.datos.puntos as Record<string, unknown>;

  it("el último cambio es de quien editó; lo intacto conserva su autor", () => {
    assert.equal(leerAutoriaPunto(puntos.p2)?.editadoPor, "beto");
    assert.equal(leerAutoriaPunto(puntos.p3)?.editadoPor, "ana");
  });

  it("una foto nueva sin cambiar calificación también cuenta como cambio", () => {
    assert.equal(leerAutoriaPunto(puntos.p1)?.editadoPor, "beto");
    const c = edicion.cambios.find((x) => x.tipo === "punto" && x.clave === "p1");
    assert.ok(c && c.tipo === "punto" && c.foto);
  });

  it("la bitácora dice qué valía, qué vale y de quién era", () => {
    const c = edicion.cambios.find((x) => x.tipo === "punto" && x.clave === "p2");
    assert.ok(c && c.tipo === "punto");
    assert.equal(c.antes, "Bueno");
    assert.equal(c.despues, "Regular");
    assert.equal(c.nota, "Desgaste");
    assert.equal(c.antesPor, "Ana");
  });

  it("la fase guarda quién la capturó primero y quién al último", () => {
    const fase = leerAutoriaFase(edicion.datos);
    assert.equal(fase?.primera?.id, "ana");
    assert.equal(fase?.ultima.id, "beto");
    assert.equal(fase?.ediciones, 1);
  });

  it("volver a guardar sin cambios no le quita el crédito a nadie", () => {
    const igual = estamparAutoria({
      anterior: edicion.datos,
      nuevo: {
        puntos: {
          p1: bueno,
          p2: { calificacion: "regular", nota: "Desgaste", noAplica: false },
          p3: { calificacion: "malo", nota: "Golpe", noAplica: false },
        },
      },
      tocados: [],
      autor: ana,
      puntosCatalogo: catalogo,
    });
    assert.equal(igual.huboCambios, false);
    assert.equal(igual.cambios.length, 0);
    assert.equal(leerAutoriaFase(igual.datos)?.ultima.id, "beto");
    assert.equal(leerAutoriaPunto((igual.datos.puntos as Record<string, unknown>).p2)?.editadoPor, "beto");
  });
});

describe("autoría de fases sin puntos", () => {
  it("lista los campos cambiados sin exponer firmas ni ids", () => {
    const r = estamparAutoria({
      anterior: { numero: "T-10", placas: "ABC123", tractorId: "x", _autoria: { primera: ana, ultima: ana, ediciones: 0 } },
      nuevo: { numero: "T-10", placas: "XYZ987", tractorId: "y" },
      tocados: [],
      autor: beto,
    });
    assert.deepEqual(r.cambios, [{ tipo: "campo", campo: "Placas", antes: "ABC123", despues: "XYZ987" }]);
  });

  it("una firma se describe, no se copia", () => {
    const r = estamparAutoria({
      anterior: { inspector: { nombre: "Ana", firma: null } },
      nuevo: { inspector: { nombre: "Ana", firma: "data:image/png;base64,AAAA" } },
      tocados: [],
      autor: ana,
    });
    const c = r.cambios[0];
    assert.ok(c.tipo === "campo" && !JSON.stringify(c).includes("base64"));
  });

  it("los datos guardados antes de esto (sin autoría) se pueden editar", () => {
    const r = estamparAutoria({
      anterior: { factura: "F-1" },
      nuevo: { factura: "F-2" },
      tocados: [],
      autor: beto,
    });
    const fase = leerAutoriaFase(r.datos);
    assert.equal(fase?.primera, null);
    assert.equal(fase?.ultima.id, "beto");
  });

  it("no guarda la lista de tocados que manda el teléfono", () => {
    const r = estamparAutoria({
      anterior: undefined,
      nuevo: { factura: "F-1", _tocados: ["x"] },
      tocados: ["x"],
      autor: ana,
    });
    assert.equal("_tocados" in r.datos, false);
  });
});

describe("tocados del teléfono", () => {
  it("descarta lo que no es una lista de textos", () => {
    assert.deepEqual(leerTocados({ _tocados: "p1" }), []);
    assert.deepEqual(leerTocados({ _tocados: ["p1", 3, ""] }), ["p1"]);
    assert.deepEqual(leerTocados(null), []);
  });
});
