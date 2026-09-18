import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsearCorreos } from "./parsear";

describe("parsearCorreos", () => {
  it("acepta comas, espacios y saltos", () => {
    assert.deepEqual(
      parsearCorreos("ana@empresa.com,  beto@empresa.com\ncaro@empresa.com"),
      ["ana@empresa.com", "beto@empresa.com", "caro@empresa.com"]
    );
  });

  it("ignora inválidos y duplicados", () => {
    assert.deepEqual(parsearCorreos("no-es-correo, ana@empresa.com, ANA@empresa.com"), [
      "ana@empresa.com",
    ]);
  });
});
