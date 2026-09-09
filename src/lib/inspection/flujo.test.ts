import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FASES } from "./fases";
import { clavePaso, construirFlujo, puedeAbrir, type EstadoFlujo } from "./flujo";
import { CAPACIDADES, numeroDeUnidades, TIPOS_TRANSPORTE } from "./transporte";

/**
 * Pruebas del motor de flujo.
 *
 * Aquí vive la lógica de negocio que decide qué se le pide al inspector.
 * Un error se traduce en una inspección incompleta que nadie nota hasta la
 * auditoría, así que se prueba de verdad, no de vista.
 */

const base = (extra: Partial<EstadoFlujo> = {}): EstadoFlujo => ({
  tipoTransporte: null,
  esFull: false,
  completados: [],
  ...extra,
});

const claves = (estado: EstadoFlujo) =>
  construirFlujo(estado).pasos.map((p) => p.clave);

describe("numeroDeUnidades", () => {
  it("un contenedor full da dos cajas", () => {
    assert.equal(numeroDeUnidades("contenedor", true), 2);
  });

  it("un contenedor sencillo da una", () => {
    assert.equal(numeroDeUnidades("contenedor", false), 1);
  });

  it("una van da una: la caja es parte del camión, pero se inspecciona", () => {
    assert.equal(numeroDeUnidades("van", false), 1);
  });

  it("una pipa no da ninguna: el tanque no se abre", () => {
    assert.equal(numeroDeUnidades("pipa", false), 0);
  });

  it("ignora 'full' en tipos que no lo admiten", () => {
    // Una plataforma marcada como full no debe generar una segunda caja
    // fantasma que el inspector nunca va a poder llenar.
    assert.equal(numeroDeUnidades("plataforma", true), 1);
  });

  it("sin tipo de transporte todavía, no asume nada", () => {
    assert.equal(numeroDeUnidades(null, false), 0);
  });
});

describe("construirFlujo · fases condicionales", () => {
  it("un contenedor lleva tamaño, interna, placas y externa", () => {
    const c = claves(base({ tipoTransporte: "contenedor" }));
    assert.ok(c.includes("tamano"));
    assert.ok(c.includes("inspeccion-interna~1"));
    assert.ok(c.includes("placas-remolque~1"));
    assert.ok(c.includes("inspeccion-externa~1"));
  });

  it("una van lleva interna pero no externa ni tamaño", () => {
    const c = claves(base({ tipoTransporte: "van" }));
    assert.ok(c.includes("inspeccion-interna~1"), "debe inspeccionarse por dentro");
    assert.ok(!c.some((k) => k.startsWith("inspeccion-externa")), "no hay remolque");
    assert.ok(!c.includes("tamano"), "no maneja medida estándar");
  });

  it("una plataforma lleva externa pero no interna", () => {
    const c = claves(base({ tipoTransporte: "plataforma" }));
    assert.ok(c.includes("inspeccion-externa~1"));
    assert.ok(!c.some((k) => k.startsWith("inspeccion-interna")));
  });

  it("una pipa no lleva ninguna inspección de caja ni sellos", () => {
    const c = claves(base({ tipoTransporte: "pipa" }));
    assert.ok(!c.some((k) => k.startsWith("inspeccion-interna")));
    assert.ok(!c.some((k) => k.startsWith("inspeccion-externa")));
    assert.ok(!c.some((k) => k.startsWith("sellos")));
    // Pero el tractor sí se inspecciona siempre.
    assert.ok(c.includes("tractor-visual"));
  });

  it("pone seguridad agrícola antes de la pausa de carga, en todos los tipos", () => {
    for (const tipo of TIPOS_TRANSPORTE) {
      const c = claves(base({ tipoTransporte: tipo }));
      const agricola = c.indexOf("agricola");
      const pausa = c.indexOf("pausa");
      assert.ok(agricola >= 0, `${tipo}: falta seguridad agrícola`);
      assert.ok(pausa >= 0, `${tipo}: falta la pausa`);
      assert.ok(
        agricola < pausa,
        `${tipo}: agrícola (${agricola}) debe ir antes de la pausa (${pausa})`
      );
    }
  });

  it("una caja refrigerada también pide placas de remolque", () => {
    const c = claves(base({ tipoTransporte: "caja_refrigerada" }));
    assert.ok(c.some((k) => k.startsWith("placas-remolque")));
  });

  it("solo la caja refrigerada pide temperaturas", () => {
    const refrigerada = claves(base({ tipoTransporte: "caja_refrigerada" }));
    assert.ok(
      refrigerada.some((k) => k.startsWith("temperaturas")),
      "una caja refrigerada debe registrar temperaturas"
    );

    for (const tipo of TIPOS_TRANSPORTE) {
      if (tipo === "caja_refrigerada") continue;
      const c = claves(base({ tipoTransporte: tipo }));
      assert.ok(
        !c.some((k) => k.startsWith("temperaturas")),
        `${tipo} no lleva refrigeración y no debería pedir temperaturas`
      );
    }
  });

  it("explica por qué omitió cada fase", () => {
    const flujo = construirFlujo(base({ tipoTransporte: "pipa" }));
    assert.ok(flujo.omitidas.length > 0);
    for (const o of flujo.omitidas) {
      assert.ok(o.razon.length > 0, `la fase ${o.fase.id} se omitió sin explicación`);
    }
  });
});

describe("construirFlujo · full", () => {
  it("duplica solo las fases por unidad, no todo el flujo", () => {
    const sencillo = construirFlujo(base({ tipoTransporte: "contenedor" }));
    const full = construirFlujo(base({ tipoTransporte: "contenedor", esFull: true }));

    const porUnidad = FASES.filter((f) => f.porUnidad && (!f.aplica || f.aplica({ tipoTransporte: "contenedor", esFull: true })));

    assert.equal(
      full.totalPasos - sencillo.totalPasos,
      porUnidad.length,
      "un full debe agregar exactamente un paso por cada fase por-unidad"
    );
  });

  it("numera las cajas en el título solo cuando hay más de una", () => {
    const full = construirFlujo(base({ tipoTransporte: "contenedor", esFull: true }));
    const sellos = full.pasos.filter((p) => p.fase.id === "sellos");
    assert.equal(sellos.length, 2);
    assert.ok(sellos[0].titulo.includes("Caja 1"));
    assert.ok(sellos[1].titulo.includes("Caja 2"));

    const sencillo = construirFlujo(base({ tipoTransporte: "contenedor" }));
    const unSello = sencillo.pasos.find((p) => p.fase.id === "sellos");
    assert.ok(!unSello!.titulo.includes("Caja"), "con una sola caja no se numera");
  });
});

describe("construirFlujo · avance", () => {
  it("empieza en 0% y no se cae con el flujo vacío", () => {
    const flujo = construirFlujo(base());
    assert.equal(flujo.porcentaje, 0);
    assert.ok(flujo.totalPasos > 0);
  });

  it("cuenta solo los pasos que aplican", () => {
    const flujo = construirFlujo(
      base({ tipoTransporte: "van", completados: ["configuracion", "cliente"] })
    );
    assert.equal(flujo.completados, 2);
    assert.equal(
      flujo.porcentaje,
      Math.round((2 / flujo.totalPasos) * 100)
    );
  });

  it("llega a 100% cuando todo está hecho", () => {
    const inicial = construirFlujo(base({ tipoTransporte: "van" }));
    const flujo = construirFlujo(
      base({ tipoTransporte: "van", completados: inicial.pasos.map((p) => p.clave) })
    );
    assert.equal(flujo.porcentaje, 100);
    assert.equal(flujo.siguiente, null);
  });

  it("ignora completados de fases que ya no aplican", () => {
    // Caso real: el inspector marca la externa, luego corrige el tipo de
    // transporte a "van", que no la lleva. Ese avance no debe seguir contando.
    const flujo = construirFlujo(
      base({ tipoTransporte: "van", completados: ["inspeccion-externa~1", "cliente"] })
    );
    assert.equal(flujo.completados, 1, "solo 'cliente' sigue siendo válido");
  });
});

describe("construirFlujo · secciones críticas", () => {
  it("no deja pausar hasta terminar las críticas", () => {
    const flujo = construirFlujo(base({ tipoTransporte: "contenedor" }));
    assert.equal(flujo.puedePausar, false);
    assert.ok(flujo.criticosPendientes.length > 0);
  });

  it("libera pausa y navegación al completar las críticas", () => {
    const inicial = construirFlujo(base({ tipoTransporte: "contenedor" }));
    const criticas = inicial.pasos.filter((p) => p.fase.critica).map((p) => p.clave);

    const flujo = construirFlujo(
      base({ tipoTransporte: "contenedor", completados: criticas })
    );
    assert.equal(flujo.puedePausar, true);
    assert.equal(flujo.navegacionLibre, true);
    assert.equal(flujo.criticosPendientes.length, 0);
  });

  it("el tipo de transporte es crítico: de él dependen las demás fases", () => {
    const fase = FASES.find((f) => f.id === "tipo-transporte");
    assert.equal(fase?.critica, true);
  });
});

describe("puedeAbrir", () => {
  it("antes de las críticas solo deja abrir el siguiente pendiente", () => {
    const flujo = construirFlujo(base({ tipoTransporte: "contenedor" }));
    assert.equal(puedeAbrir(flujo, flujo.siguiente!.clave), true);
    assert.equal(puedeAbrir(flujo, "firmas"), false, "no se puede brincar al final");
  });

  it("deja volver a algo ya terminado para corregirlo", () => {
    const flujo = construirFlujo(
      base({ tipoTransporte: "contenedor", completados: ["configuracion"] })
    );
    assert.equal(puedeAbrir(flujo, "configuracion"), true);
  });

  it("con las críticas listas deja abrir cualquiera", () => {
    const inicial = construirFlujo(base({ tipoTransporte: "contenedor" }));
    const criticas = inicial.pasos.filter((p) => p.fase.critica).map((p) => p.clave);
    const flujo = construirFlujo(
      base({ tipoTransporte: "contenedor", completados: criticas })
    );
    assert.equal(puedeAbrir(flujo, "comentarios"), true);
  });

  it("rechaza una clave que no existe en este flujo", () => {
    const flujo = construirFlujo(base({ tipoTransporte: "van" }));
    assert.equal(puedeAbrir(flujo, "inspeccion-externa~1"), false);
    assert.equal(puedeAbrir(flujo, "inventada"), false);
  });
});

describe("integridad del catálogo", () => {
  it("no hay ids de fase repetidos", () => {
    const ids = FASES.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("toda fase condicional explica por qué se omite", () => {
    for (const fase of FASES) {
      if (fase.aplica) {
        assert.ok(
          fase.razonNoAplica,
          `la fase ${fase.id} es condicional pero no dice por qué se omite`
        );
      }
    }
  });

  it("cada tipo de transporte produce un flujo utilizable", () => {
    for (const tipo of TIPOS_TRANSPORTE) {
      for (const esFull of [false, true]) {
        const flujo = construirFlujo(base({ tipoTransporte: tipo, esFull }));

        assert.ok(
          flujo.totalPasos > 0,
          `${tipo} (full=${esFull}) se quedó sin pasos`
        );
        // El tractor y las firmas se inspeccionan siempre, sea cual sea la unidad.
        const c = flujo.pasos.map((p) => p.clave);
        assert.ok(c.includes("tractor-visual"), `${tipo}: falta la inspección de tractor`);
        assert.ok(c.includes("firmas"), `${tipo}: faltan las firmas`);
        // Ninguna clave repetida.
        assert.equal(new Set(c).size, c.length, `${tipo}: hay pasos duplicados`);
      }
    }
  });

  it("la tabla de capacidades cubre todos los tipos del enum de la base", () => {
    // Si alguien agrega un tipo en Postgres y olvida la fila aquí, esto truena.
    for (const tipo of TIPOS_TRANSPORTE) {
      assert.ok(CAPACIDADES[tipo], `falta la fila de ${tipo}`);
      assert.ok(CAPACIDADES[tipo].nombre.length > 0);
    }
  });

  it("clavePaso genera claves estables", () => {
    assert.equal(clavePaso("sellos", null), "sellos");
    assert.equal(clavePaso("sellos", 2), "sellos~2");
  });

  it("toda clave de paso es segura para una URL", () => {
    // Regresión: el separador era "#", que en una URL corta el fragmento.
    // /inspeccion/<id>/sellos#2 llegaba al servidor como "sellos", que no es
    // una clave válida — las fases por unidad eran inalcanzables.
    //
    // Se comprueba que la clave sobreviva intacta a un viaje por la URL.
    for (const tipo of TIPOS_TRANSPORTE) {
      for (const esFull of [false, true]) {
        for (const paso of construirFlujo(base({ tipoTransporte: tipo, esFull })).pasos) {
          const url = new URL(`https://x/inspeccion/abc/${paso.clave}`);
          const recibido = decodeURIComponent(url.pathname.split("/").pop()!);

          assert.equal(
            recibido,
            paso.clave,
            `la clave "${paso.clave}" no sobrevive a la URL (llega como "${recibido}")`
          );
          assert.equal(url.hash, "", `la clave "${paso.clave}" genera un fragmento`);
          assert.equal(url.search, "", `la clave "${paso.clave}" genera un query`);
        }
      }
    }
  });
});
