import type { Cambio } from "@/lib/inspection/autoria";
import { FASES_POR_ID } from "@/lib/inspection/fases";
import { faseIdDeClave } from "@/lib/inspection/flujo";

export function comoObjeto(valor: unknown): Record<string, unknown> | null {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }
  return null;
}

/** "Inspección externa · Caja 2": el paso, no solo la fase. */
export function nombrePaso(clave: unknown): string | null {
  if (typeof clave !== "string" || !clave) return null;
  const fase = FASES_POR_ID.get(faseIdDeClave(clave))?.nombre ?? clave;
  const caja = clave.match(/~(\d+)$/)?.[1];
  return caja ? `${fase} · Caja ${caja}` : fase;
}

type Nombres = (id: unknown) => string | null;

export function textoSugerencia(valor: unknown): string | null {
  if (valor === "sin_novedad") return "se ve bien";
  if (valor === "revisar") return "se ve regular";
  if (valor === "atencion") return "se ve mal";
  return null;
}

export function textoCalidad(valor: unknown): string | null {
  if (valor === "buena" || valor === "regular" || valor === "mala") return valor;
  return null;
}

export function textoConfianza(valor: unknown): string | null {
  if (typeof valor !== "number" || Number.isNaN(valor)) return null;
  return `${Math.round(valor * 100)}%`;
}

/** Lo que la IA dejó guardado en una foto. Ignora campos extra del modelo. */
export type AnalisisLegible = {
  observacion: string;
  indicios: string[];
  calidad: string;
  problemaCalidad: string | null;
  sugerencia: string;
  confianza: number | null;
};

export function leerAnalisisGuardado(valor: unknown): AnalisisLegible | null {
  const o = comoObjeto(valor);
  if (!o || typeof o.observacion !== "string" || typeof o.sugerencia !== "string") {
    return null;
  }
  const indicios = Array.isArray(o.indicios)
    ? o.indicios.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  return {
    observacion: o.observacion,
    indicios,
    calidad: textoCalidad(o.calidadImagen) ?? "—",
    problemaCalidad:
      typeof o.problemaCalidad === "string" && o.problemaCalidad.trim()
        ? o.problemaCalidad.trim()
        : null,
    sugerencia: o.sugerencia,
    confianza: typeof o.confianza === "number" ? o.confianza : null,
  };
}

export function describir(
  evento: string,
  payload: Record<string, unknown>,
  nombre: Nombres
): string {
  switch (evento) {
    case "started":
      return "Inició la inspección";
    case "paused":
      return "Pausó la inspección";
    case "resumed":
      return "Reanudó la inspección";
    case "phase_completed": {
      const fase = nombrePaso(payload.paso) ?? "una fase";
      if (payload.sinCambios) return `Revisó ${fase} sin cambios`;
      return payload.edicion ? `Editó ${fase}` : `Completó ${fase}`;
    }
    case "completed":
      return payload.aprobada === false
        ? "Cerró la inspección · rechazada"
        : "Cerró la inspección · aprobada";
    case "cancelled": {
      const motivo = typeof payload.motivo === "string" ? payload.motivo.trim() : "";
      return motivo ? `Canceló la inspección · ${motivo}` : "Canceló la inspección";
    }
    case "lead_claimed":
      return "Quedó como encargado al empezar la inspección";
    case "assigned": {
      const de = nombre(payload.de);
      const a = nombre(payload.a);
      if (de && a) return `Cambió el encargado: de ${de} a ${a}`;
      return a ? `Asignó la inspección a ${a}` : "Asignó la inspección";
    }
    case "unassigned": {
      const de = nombre(payload.de);
      return de ? `Quitó la asignación a ${de}` : "Quitó la asignación";
    }
    case "created_by_admin": {
      const a = nombre(payload.asignadaA);
      const tipo = payload.colectiva ? "colectiva " : "";
      return a
        ? `La creó desde el panel como ${tipo}inspección con encargado ${a}`
        : `La creó desde el panel${tipo ? " como inspección colectiva" : ""}`;
    }
    case "scheduled": {
      const a = nombre(payload.a);
      return a ? `La programó en el calendario para ${a}` : "La programó en el calendario";
    }
    case "verification_revoked":
      return "Revocó el QR de verificación";
    case "ai_analysis": {
      const punto = typeof payload.punto === "string" ? payload.punto : "una foto";
      const sug = textoSugerencia(comoObjeto(payload.resultado)?.sugerencia);
      return sug ? `Usó IA en ${punto} · ${sug}` : `Usó IA en ${punto}`;
    }
    case "ai_lectura": {
      const tipo = payload.uso === "placas" ? "las placas" : "la licencia";
      const numero = comoObjeto(payload.resultado)?.numero;
      return typeof numero === "string" && numero.trim()
        ? `Usó IA para leer ${tipo} · ${numero.trim()}`
        : `Usó IA para leer ${tipo}`;
    }
    case "ai_ocr": {
      const campo = typeof payload.etiqueta === "string" ? payload.etiqueta : "un documento";
      const valor = comoObjeto(payload.resultado)?.valor;
      return typeof valor === "string" && valor.trim()
        ? `Usó IA para leer ${campo} · ${valor.trim()}`
        : `Usó IA para leer ${campo}`;
    }
    default:
      return evento.replace(/_/g, " ");
  }
}

export function leerCambios(payload: Record<string, unknown>): Cambio[] {
  const c = payload.cambios;
  if (!Array.isArray(c)) return [];
  return c.filter(
    (x): x is Cambio =>
      Boolean(x) && typeof x === "object" && (x.tipo === "punto" || x.tipo === "campo")
  );
}

export function leerResumen(payload: Record<string, unknown>): string | null {
  const r = payload.resumen;
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  const partes = Object.entries(r as Record<string, unknown>)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([estado, n]) => `${n} ${estado}`);
  return partes.length ? partes.join(" · ") : null;
}

/** El texto del resultado, para leerlo en la bitácora sin abrir la foto. */
export function lineasResultadoIa(
  evento: string,
  payload: Record<string, unknown>
): string[] {
  const r = comoObjeto(payload.resultado);
  if (!r) return [];

  if (evento === "ai_analysis") {
    const lineas: string[] = [];
    if (typeof r.observacion === "string" && r.observacion.trim()) {
      lineas.push(r.observacion.trim());
    }
    const indicios = Array.isArray(r.indicios)
      ? r.indicios.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    if (indicios.length) lineas.push(`Indicios: ${indicios.join("; ")}`);
    const extra = [
      textoCalidad(r.calidadImagen) ? `Foto ${textoCalidad(r.calidadImagen)}` : null,
      typeof r.problemaCalidad === "string" && r.problemaCalidad.trim()
        ? r.problemaCalidad.trim()
        : null,
      textoConfianza(r.confianza) ? `confianza ${textoConfianza(r.confianza)}` : null,
    ].filter((x): x is string => Boolean(x));
    if (extra.length) lineas.push(extra.join(" · "));
    return lineas;
  }

  if (evento === "ai_lectura" || evento === "ai_ocr") {
    const lineas: string[] = [];
    if (typeof r.nombre === "string" && r.nombre.trim()) {
      lineas.push(`Nombre: ${r.nombre.trim()}`);
    }
    if (typeof r.numero === "string" && r.numero.trim()) {
      lineas.push(`Número: ${r.numero.trim()}`);
    }
    if (typeof r.valor === "string" && r.valor.trim()) {
      lineas.push(`Leyó: ${r.valor.trim()}`);
    }
    if (r.dudoso === true) lineas.push("La IA marcó la lectura como dudosa.");
    if (typeof r.problema === "string" && r.problema.trim()) {
      lineas.push(r.problema.trim());
    }
    if (lineas.length === 0) lineas.push("La IA no encontró un dato legible.");
    return lineas;
  }

  return [];
}
