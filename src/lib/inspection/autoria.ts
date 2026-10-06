/**
 * Autoría de lo capturado: quién hizo cada cosa y quién la cambió al último.
 *
 * ── Dónde vive ──────────────────────────────────────────────────────────────
 *
 *   Fase    `data[paso]._autoria` = { primera, ultima, ediciones }.
 *   Punto   `data[paso].puntos[clave]` lleva editadoPor / editadoPorNombre /
 *           editadoEn junto a su calificación.
 *   Cambios Van en la bitácora (inspection_events.payload.cambios): qué valía
 *           antes, qué vale ahora y de quién era lo anterior.
 *
 * ── Quién estampa ───────────────────────────────────────────────────────────
 *
 * Solo el servidor, al guardar, con el usuario de la sesión. El teléfono no
 * manda nombres: a lo más dice qué puntos tocó (`_tocados`), y eso solo puede
 * atribuirle cambios a quien guarda, nunca a otro.
 *
 * Todo es lógica pura para poder probarla sin base de datos.
 */

export type Autor = { id: string; nombre: string; en: string };

export type AutoriaFase = {
  /** Quien la capturó por primera vez. Null en fases de antes de esto. */
  primera: Autor | null;
  /** Quien hizo el último cambio real (no solo volver a guardar igual). */
  ultima: Autor;
  /** Veces que alguien la cambió después de la primera captura. */
  ediciones: number;
};

export type AutoriaPunto = {
  editadoPor: string;
  editadoPorNombre: string;
  editadoEn: string;
};

export type Cambio =
  | {
      tipo: "punto";
      clave: string;
      /** "10. Puertas traseras" */
      nombre: string;
      antes: string | null;
      despues: string;
      nota?: string;
      /** Se tomó una foto nueva del punto. */
      foto?: boolean;
      /** De quién era lo anterior, si era de otra persona. */
      antesPor?: string;
    }
  | {
      tipo: "campo";
      campo: string;
      antes: string;
      despues: string;
    };

export const CLAVE_AUTORIA = "_autoria";
export const CLAVE_TOCADOS = "_tocados";

/** Tope de cambios por evento: la bitácora resume, no transcribe. */
export const MAX_CAMBIOS = 60;

type Obj = Record<string, unknown>;

function esObjeto(v: unknown): v is Obj {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export function leerAutoriaFase(datosFase: unknown): AutoriaFase | null {
  if (!esObjeto(datosFase)) return null;
  const a = datosFase[CLAVE_AUTORIA];
  if (!esObjeto(a) || !esAutor(a.ultima)) return null;
  return {
    primera: esAutor(a.primera) ? a.primera : null,
    ultima: a.ultima,
    ediciones: typeof a.ediciones === "number" ? a.ediciones : 0,
  };
}

export function leerAutoriaPunto(punto: unknown): AutoriaPunto | null {
  if (!esObjeto(punto)) return null;
  const { editadoPor, editadoPorNombre, editadoEn } = punto;
  if (typeof editadoPor !== "string" || typeof editadoEn !== "string") return null;
  return {
    editadoPor,
    editadoPorNombre: typeof editadoPorNombre === "string" ? editadoPorNombre : "",
    editadoEn,
  };
}

function esAutor(v: unknown): v is Autor {
  return (
    esObjeto(v) &&
    typeof v.id === "string" &&
    typeof v.nombre === "string" &&
    typeof v.en === "string"
  );
}

/** Los puntos que el teléfono dice haber tocado. Basura → lista vacía. */
export function leerTocados(crudo: unknown): string[] {
  if (!esObjeto(crudo)) return [];
  const t = crudo[CLAVE_TOCADOS];
  if (!Array.isArray(t)) return [];
  return t
    .filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 120)
    .slice(0, 100);
}

// ── Descripción de valores ───────────────────────────────────────────────────

const ETIQUETAS: Record<string, string> = {
  fecha: "Fecha",
  horaEntrada: "Hora de entrada",
  clienteNombre: "Transportista",
  tipo: "Tipo de transporte",
  esFull: "Full",
  tamano: "Tamaño",
  movimiento: "Movimiento",
  movimientoOtro: "Movimiento (otro)",
  estado: "Estado",
  recepcionMercancia: "Recepción de mercancía",
  mercanciaRechazada: "Mercancía rechazada",
  razonRechazo: "Razón del rechazo",
  comentarioRechazo: "Comentario del rechazo",
  factura: "Factura",
  billOfLading: "Bill of Lading",
  pedimento: "Pedimento",
  sellosFiscales: "Sellos fiscales",
  otros: "Otros documentos",
  nombre: "Nombre",
  licencia: "Licencia",
  adicionales: "Adicionales",
  numero: "Número",
  placas: "Placas",
  escalamiento: "Decisión ante hallazgos",
  escalamientoNota: "Comentario de la decisión",
  sellos: "Sellos",
  lecturas: "Temperaturas",
  externaLimpia: "Revisión externa limpia",
  externaNota: "Hallazgo externo",
  internaLimpia: "Revisión interna limpia",
  internaNota: "Hallazgo interno",
  comentarios: "Comentarios",
  inspector: "Firma del inspector",
  conductor: "Firma del conductor",
  participantes: "Firmas de participantes",
};

/**
 * Campos que no se describen: ids internos (el nombre ya va aparte) y
 * precisión del GPS. Cambian sin que cambie nada que alguien vaya a leer.
 */
const IGNORADOS = new Set([
  "clienteId",
  "conductorId",
  "tractorId",
  "contenedorId",
  "precision",
  "origenUbicacion",
  "puntos",
]);

function describirValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    // Firmas: son imágenes en base64. Imprimirlas sería ilegible.
    if (v.startsWith("data:")) return "firma capturada";
    const t = v.trim();
    return t.length > 80 ? `${t.slice(0, 77)}…` : t;
  }
  if (Array.isArray(v)) {
    return v.length === 0 ? "—" : `${v.length} ${v.length === 1 ? "registro" : "registros"}`;
  }
  if (esObjeto(v)) {
    // Firmas del inspector y del conductor: { nombre, firma }.
    if (typeof v.nombre === "string") {
      return v.firma ? `${v.nombre} (firmó)` : v.nombre || "—";
    }
    return "actualizado";
  }
  return "actualizado";
}

/** Igualdad estructural sin depender del orden de las llaves. */
function iguales(a: unknown, b: unknown): boolean {
  return estable(a) === estable(b);
}

function estable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estable).join(",")}]`;
  if (esObjeto(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estable(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

// ── Puntos de inspección ─────────────────────────────────────────────────────

type PuntoCatalogo = { clave: string; nombre: string };

function estadoDePunto(p: Obj): string {
  if (p.noAplica) return "No aplica";
  const c = typeof p.calificacion === "string" ? p.calificacion : "";
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : "—";
}

function mismoPunto(a: Obj, b: Obj): boolean {
  return (
    Boolean(a.noAplica) === Boolean(b.noAplica) &&
    (a.calificacion ?? null) === (b.calificacion ?? null) &&
    String(a.nota ?? "").trim() === String(b.nota ?? "").trim()
  );
}

function esHallazgo(p: Obj): boolean {
  return !p.noAplica && (p.calificacion === "regular" || p.calificacion === "malo");
}

// ── Estampado ────────────────────────────────────────────────────────────────

export type ResultadoAutoria = {
  /** Lo que se guarda: los datos con la autoría puesta. */
  datos: Obj;
  /** Para la bitácora. */
  cambios: Cambio[];
  /** Ya había una captura de esta fase antes de este guardado. */
  edicion: boolean;
  /** Hubo al menos un cambio real. */
  huboCambios: boolean;
  /** Resumen de una primera captura de puntos: cuántos de cada calificación. */
  resumen?: Record<string, number>;
};

/**
 * Pone la autoría en los datos validados de una fase.
 *
 * Regla de "último cambio": un punto (o la fase) cambia de dueño solo si su
 * contenido cambió o se le tomó foto nueva. Volver a guardar sin tocar nada
 * no le quita el crédito a quien lo hizo.
 */
export function estamparAutoria({
  anterior,
  nuevo,
  tocados,
  autor,
  puntosCatalogo,
}: {
  anterior: unknown;
  nuevo: Obj;
  tocados: string[];
  autor: Autor;
  /** Solo en fases de inspección visual. */
  puntosCatalogo?: PuntoCatalogo[] | null;
}): ResultadoAutoria {
  const previo = esObjeto(anterior) ? anterior : null;
  const edicion = previo !== null;
  const cambios: Cambio[] = [];
  const datos: Obj = { ...nuevo };
  delete datos[CLAVE_TOCADOS];
  delete datos[CLAVE_AUTORIA];

  const tocadosSet = new Set(tocados);
  let resumen: Record<string, number> | undefined;

  // ── Puntos ────────────────────────────────────────────────────────────
  if (puntosCatalogo && esObjeto(nuevo.puntos)) {
    const puntosPrevios = previo && esObjeto(previo.puntos) ? previo.puntos : {};
    const puntosNuevos: Obj = {};
    const orden = new Map(puntosCatalogo.map((p, i) => [p.clave, i]));
    const nombreDe = (clave: string) => {
      const i = orden.get(clave);
      return i === undefined ? clave : `${i + 1}. ${puntosCatalogo[i].nombre}`;
    };

    if (!edicion) resumen = {};

    for (const [clave, valor] of Object.entries(nuevo.puntos)) {
      if (!esObjeto(valor)) continue;
      const antes = esObjeto(puntosPrevios[clave]) ? (puntosPrevios[clave] as Obj) : null;
      const autoriaAntes = leerAutoriaPunto(antes);
      const cambio = !antes || !mismoPunto(antes, valor);
      const foto = tocadosSet.has(clave);

      if (cambio || foto) {
        puntosNuevos[clave] = {
          ...valor,
          editadoPor: autor.id,
          editadoPorNombre: autor.nombre,
          editadoEn: autor.en,
        } satisfies Obj & AutoriaPunto;

        // Primera captura: solo los hallazgos van a la bitácora, los demás
        // se cuentan en el resumen. 41 líneas de "Bueno" no ayudan a nadie.
        const registrar = edicion || esHallazgo(valor);
        if (registrar) {
          const nota = String(valor.nota ?? "").trim();
          cambios.push({
            tipo: "punto",
            clave,
            nombre: nombreDe(clave),
            antes: antes ? estadoDePunto(antes) : null,
            despues: estadoDePunto(valor),
            ...(nota && (!antes || String(antes.nota ?? "").trim() !== nota) ? { nota } : {}),
            ...(foto ? { foto: true } : {}),
            ...(autoriaAntes && autoriaAntes.editadoPor !== autor.id
              ? { antesPor: autoriaAntes.editadoPorNombre || "otra persona" }
              : {}),
          });
        }
      } else {
        // Sin cambios: conserva al autor que tenía.
        puntosNuevos[clave] = autoriaAntes ? { ...valor, ...autoriaAntes } : { ...valor };
      }

      if (resumen) {
        const e = estadoDePunto(valor).toLowerCase();
        resumen[e] = (resumen[e] ?? 0) + 1;
      }
    }
    datos.puntos = puntosNuevos;
  }

  // ── Campos de la fase ─────────────────────────────────────────────────
  // En una primera captura no se listan: el valor está en el expediente.
  if (edicion) {
    const llaves = new Set([...Object.keys(datos), ...Object.keys(previo!)]);
    for (const campo of llaves) {
      if (campo.startsWith("_") || IGNORADOS.has(campo)) continue;
      const a = previo![campo];
      const b = datos[campo];
      if (iguales(a ?? null, b ?? null)) continue;
      cambios.push({
        tipo: "campo",
        campo: ETIQUETAS[campo] ?? campo,
        antes: describirValor(a),
        despues: describirValor(b),
      });
    }

    // Fotos nuevas fuera de los puntos (licencia, placas, documentos).
    if (!puntosCatalogo && tocadosSet.size > 0) {
      cambios.push({
        tipo: "campo",
        campo: "Fotos",
        antes: "—",
        despues: `${tocadosSet.size} ${tocadosSet.size === 1 ? "foto nueva" : "fotos nuevas"}`,
      });
    }
  }

  // Una edición sin cambios (volvió a guardar igual) no cambia de dueño.
  const huboCambios = !edicion || cambios.length > 0 || tocadosSet.size > 0;

  const autoriaPrevia = leerAutoriaFase(previo);
  if (huboCambios) {
    datos[CLAVE_AUTORIA] = {
      primera: edicion ? (autoriaPrevia?.primera ?? null) : autor,
      ultima: autor,
      ediciones: edicion ? (autoriaPrevia?.ediciones ?? 0) + 1 : 0,
    } satisfies AutoriaFase;
  } else if (autoriaPrevia) {
    datos[CLAVE_AUTORIA] = autoriaPrevia;
  }

  return {
    datos,
    cambios: cambios.slice(0, MAX_CAMBIOS),
    edicion,
    huboCambios,
    ...(resumen ? { resumen } : {}),
  };
}
