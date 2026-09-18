import { z } from "zod";

const correo = z.string().email();

/** Parte una lista escrita a mano (comas, espacios, saltos) en correos válidos. */
export function parsearCorreos(texto: string): string[] {
  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const pedazo of texto.split(/[\s,;]+/)) {
    const limpio = pedazo.trim().toLowerCase();
    if (!limpio || vistos.has(limpio)) continue;
    if (!correo.safeParse(limpio).success) continue;
    vistos.add(limpio);
    lista.push(limpio);
  }
  return lista;
}
