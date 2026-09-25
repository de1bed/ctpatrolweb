"use client";

import { ImageIcon, Plus, ScanLine, Thermometer, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import {
  EscanerDocumentos,
  procesarImagenDocumento,
  type LecturaCampo,
} from "@/components/inspection/document-scanner";
import { textoObjetivo, type ObjetivoDocumento } from "@/lib/ai/campos-documento";
import { cn } from "@/lib/cn";
import { fotosDePaso, guardarFoto, type FotoLocal } from "@/lib/media/almacen";
import { capturarDeArchivo } from "@/lib/media/camara";

import { previo, type PropsFase } from "./tipos";

type OtroDoc = { titulo: string; numero: string };

function MiniaturaDocumento({ foto }: { foto: FotoLocal }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!foto.blob || foto.blob.size === 0) return;
    const creada = URL.createObjectURL(foto.blob);
    setUrl(creada);
    return () => URL.revokeObjectURL(creada);
  }, [foto]);

  return (
    <figure className="w-24 shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={foto.puntoNombre} className="aspect-[3/4] w-full rounded-lg object-cover" />
      ) : (
        <div className="aspect-[3/4] w-full rounded-lg bg-surface-sunken" />
      )}
      <figcaption className="mt-1 truncate text-xs text-ink-secondary">{foto.puntoNombre}</figcaption>
    </figure>
  );
}

type SesionEscaneo = {
  objetivo: ObjetivoDocumento;
  clave: string;
  indiceOtro: number | null;
};

/** Fase · Documentos de entrada. */

export function FaseDocumentos(
  props: PropsFase & {
    soloLectura?: boolean;
    latitud?: number | null;
    longitud?: number | null;
    fotosServidor?: { id: string; nombre: string; url: string }[];
  }
) {
  const [factura, setFactura] = useState(() => previo(props.datosPrevios, "factura", ""));
  const [bl, setBl] = useState(() => previo(props.datosPrevios, "billOfLading", ""));
  const [pedimento, setPedimento] = useState(() => previo(props.datosPrevios, "pedimento", ""));
  const [sellos, setSellos] = useState(() => previo(props.datosPrevios, "sellosFiscales", ""));
  const [otros, setOtros] = useState<OtroDoc[]>(() =>
    previo<OtroDoc[]>(props.datosPrevios, "otros", [])
  );

  const [sesion, setSesion] = useState<SesionEscaneo | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [claveLeyendo, setClaveLeyendo] = useState<string | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const sesionFoto = useRef<SesionEscaneo | null>(null);
  const [dudosos, setDudosos] = useState<string[]>([]);
  const [fotosDoc, setFotosDoc] = useState<FotoLocal[]>([]);

  const bloqueado = props.soloLectura ?? false;

  useEffect(() => {
    let vivo = true;
    fotosDePaso(props.inspeccionId, props.clavePaso)
      .then((lista) => {
        if (vivo) setFotosDoc(lista.sort((a, b) => a.capturadaEn.localeCompare(b.capturadaEn)));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [props.inspeccionId, props.clavePaso]);

  async function archivarImagen(blob: Blob, etiqueta: string) {
    const capturadaEn = new Date().toISOString();
    const foto = await capturarDeArchivo(
      blob,
      {
        capturadaEn,
        latitud: props.latitud ?? null,
        longitud: props.longitud ?? null,
      },
      etiqueta
    );
    const guardada = await guardarFoto({
      clientId: crypto.randomUUID(),
      inspeccionId: props.inspeccionId,
      paso: props.clavePaso,
      puntoClave: `documento-${crypto.randomUUID()}`,
      puntoNombre: etiqueta,
      blob: foto.blob,
      mimeType: foto.mimeType,
      ancho: foto.ancho,
      alto: foto.alto,
      capturadaEn,
      latitud: props.latitud ?? null,
      longitud: props.longitud ?? null,
    });
    setFotosDoc((prev) => [...prev, guardada]);
  }

  function escribirCampo(activa: SesionEscaneo, datos: LecturaCampo) {
    const valor = datos.valor?.trim() ?? "";
    if (!valor) return;
    if (activa.objetivo.campo === "factura") setFactura(valor);
    else if (activa.objetivo.campo === "billOfLading") setBl(valor);
    else if (activa.objetivo.campo === "pedimento") setPedimento(valor);
    else if (activa.objetivo.campo === "sellosFiscales") setSellos(valor);
    else if (activa.indiceOtro !== null) {
      const indice = activa.indiceOtro;
      setOtros((prev) => prev.map((d, j) => (j === indice ? { ...d, numero: valor } : d)));
    }
    setDudosos((prev) =>
      datos.dudoso
        ? prev.includes(activa.clave)
          ? prev
          : [...prev, activa.clave]
        : prev.filter((c) => c !== activa.clave)
    );
    setCamaraAbierta(false);
    setSesion(null);
  }

  function prepararEscaneo(activa: SesionEscaneo): boolean {
    if (activa.objetivo.campo === "otro" && !activa.objetivo.titulo.trim()) {
      setErrorLectura("Escribe el título del documento antes de escanearlo.");
      return false;
    }
    setErrorLectura(null);
    setSesion(activa);
    return true;
  }

  async function aplicarDesdeGaleria(archivo: File) {
    const activa = sesionFoto.current;
    if (!activa) return;
    setClaveLeyendo(activa.clave);
    setErrorLectura(null);
    try {
      let datosLeidos: LecturaCampo | null = null;
      const r = await procesarImagenDocumento(archivo, activa.objetivo);
      if (r.ok) datosLeidos = r.datos;
      try {
        await archivarImagen(archivo, textoObjetivo(activa.objetivo).etiqueta);
      } catch {
        setErrorLectura("La foto no se pudo guardar en el dispositivo.");
      }
      if (!r.ok) {
        setErrorLectura(r.error);
        return;
      }
      const valor = r.datos.valor?.trim();
      if (!valor) {
        setErrorLectura(
          r.datos.problema ??
            `No se encontró ${textoObjetivo(activa.objetivo).etiqueta} en la foto.`
        );
        return;
      }
      escribirCampo(activa, { ...datosLeidos!, valor });
    } catch {
      setErrorLectura("No se pudo procesar la imagen.");
    } finally {
      setClaveLeyendo(null);
      sesionFoto.current = null;
    }
  }

  const marcaDudoso = (campo: string) =>
    dudosos.includes(campo)
      ? "border-warn-500 focus:ring-warn-500/15"
      : undefined;

  function abrirCamaraDe(activa: SesionEscaneo) {
    if (!prepararEscaneo(activa)) return;
    setCamaraAbierta(true);
  }

  function pedirFotoDe(activa: SesionEscaneo) {
    if (!prepararEscaneo(activa)) return;
    sesionFoto.current = activa;
    galeriaRef.current?.click();
  }

  function accionesDe(activa: SesionEscaneo) {
    if (bloqueado) return null;
    const leyendo = claveLeyendo === activa.clave;
    return (
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" disabled={leyendo} onClick={() => abrirCamaraDe(activa)}>
          <ScanLine className="size-4" aria-hidden />
          Escanear
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={leyendo}
          onClick={() => pedirFotoDe(activa)}
        >
          <ImageIcon className="size-4" aria-hidden />
          Foto
        </Button>
      </div>
    );
  }

  return (
    <PantallaFase
      {...props}
      descripcion={
        bloqueado
          ? "Estos datos los precargó tu administrador. Solo puedes consultarlos."
          : "Documentos que acompañan la carga. Escanea cada número desde su campo, o déjalo en blanco si no aplica."
      }
      recolectar={() => ({
        factura,
        billOfLading: bl,
        pedimento,
        sellosFiscales: sellos,
        otros: otros.filter((o) => o.titulo.trim() || o.numero.trim()),
      })}
    >
      <div className="flex flex-col gap-5">
        {(fotosDoc.length > 0 || (props.fotosServidor?.length ?? 0) > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fotosDoc.map((foto) => (
              <MiniaturaDocumento key={foto.clientId} foto={foto} />
            ))}
            {(props.fotosServidor ?? [])
              .filter((s) => !fotosDoc.some((f) => f.mediaId === s.id))
              .map((foto) => (
                <figure key={foto.id} className="w-24 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.nombre}
                    className="aspect-[3/4] w-full rounded-lg object-cover"
                  />
                  <figcaption className="mt-1 truncate text-xs text-ink-secondary">
                    {foto.nombre}
                  </figcaption>
                </figure>
              ))}
          </div>
        )}
        <input
          ref={galeriaRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (archivo) void aplicarDesdeGaleria(archivo);
          }}
        />
        {errorLectura && (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger-600">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {errorLectura}
          </p>
        )}

        {dudosos.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-warn-500/40 bg-warn-50 px-4 py-3 text-sm text-ink-secondary dark:bg-warn-500/10">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-600" aria-hidden />
            <span>
              Revisa contra el papel los campos resaltados: la lectura
              automática no quedó segura de esos caracteres.
            </span>
          </p>
        )}

        <Field
          label="Factura"
          ayuda="Número de factura comercial o folio. Suele aparecer en la esquina superior, etiquetado como Factura, Invoice o Folio."
        >
          {(p) => (
            <>
              <Input {...p} value={factura} disabled={bloqueado} className={cn(marcaDudoso("factura"))} onChange={(e) => setFactura(e.target.value)} />
              {accionesDe({ objetivo: { campo: "factura" }, clave: "factura", indiceOtro: null })}
            </>
          )}
        </Field>

        <Field
          label="Bill of Lading"
          ayuda="Número del Bill of Lading, guía o carta porte. Busca las siglas B/L, BL o “Bill of Lading” en el encabezado del conocimiento de embarque."
        >
          {(p) => (
            <>
              <Input {...p} value={bl} disabled={bloqueado} className={cn(marcaDudoso("billOfLading"))} onChange={(e) => setBl(e.target.value)} />
              {accionesDe({ objetivo: { campo: "billOfLading" }, clave: "billOfLading", indiceOtro: null })}
            </>
          )}
        </Field>

        <Field
          label="Pedimento"
          ayuda="Número de pedimento aduanal mexicano. Son 15 dígitos, a menudo con espacios (ej. 24 43 3456 4001234), en el encabezado del pedimento."
        >
          {(p) => (
            <>
              <Input {...p} value={pedimento} disabled={bloqueado} className={cn(marcaDudoso("pedimento"))} onChange={(e) => setPedimento(e.target.value)} />
              {accionesDe({ objetivo: { campo: "pedimento" }, clave: "pedimento", indiceOtro: null })}
            </>
          )}
        </Field>

        <Field
          label="Sellos fiscales"
          ayuda="Número del sello fiscal o candado oficial que cierra la unidad. Está impreso en el sello físico y suele repetirse en el pedimento o el BL."
        >
          {(p) => (
            <>
              <Input {...p} value={sellos} disabled={bloqueado} className={cn(marcaDudoso("sellosFiscales"))} onChange={(e) => setSellos(e.target.value)} />
              {accionesDe({
                objetivo: { campo: "sellosFiscales" },
                clave: "sellosFiscales",
                indiceOtro: null,
              })}
            </>
          )}
        </Field>

        {/* Documentos extra: cada empresa maneja los suyos y no cabe fijarlos
            en el formulario. Se capturan como pares título/número. */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-ink-secondary">
            Otros documentos
          </p>

          <div className="flex flex-col gap-2.5">
            {otros.map((doc, i) => (
              <Card key={i} className="flex items-start gap-2 p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    value={doc.titulo}
                    disabled={bloqueado}
                    placeholder="Título (ej. Carta porte)"
                    onChange={(e) =>
                      setOtros((prev) =>
                        prev.map((d, j) => (j === i ? { ...d, titulo: e.target.value } : d))
                      )
                    }
                  />
                  <Input
                    value={doc.numero}
                    disabled={bloqueado}
                    placeholder="Número"
                    onChange={(e) =>
                      setOtros((prev) =>
                        prev.map((d, j) => (j === i ? { ...d, numero: e.target.value } : d))
                      )
                    }
                    className={cn(marcaDudoso(`otro-${i}`))}
                  />
                  {accionesDe({
                    objetivo: { campo: "otro", titulo: doc.titulo },
                    clave: `otro-${i}`,
                    indiceOtro: i,
                  })}
                </div>
                {!bloqueado && (
                  <button
                    type="button"
                    aria-label={`Quitar documento ${i + 1}`}
                    onClick={() => setOtros((prev) => prev.filter((_, j) => j !== i))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors active:bg-danger-50"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                )}
              </Card>
            ))}

            {!bloqueado && (
              <Button
                variant="secondary"
                onClick={() => setOtros((prev) => [...prev, { titulo: "", numero: "" }])}
                className="justify-start"
              >
                <Plus className="size-5" aria-hidden />
                Agregar documento
              </Button>
            )}
          </div>
        </div>
      </div>

      {camaraAbierta && sesion && (
        <EscanerDocumentos
          objetivo={sesion.objetivo}
          onExtraer={(datos) => escribirCampo(sesion, datos)}
          onImagen={(blob) => {
            void archivarImagen(blob, textoObjetivo(sesion.objetivo).etiqueta);
          }}
          onCerrar={() => {
            setCamaraAbierta(false);
            setSesion(null);
          }}
        />
      )}
    </PantallaFase>
  );
}

/** Fase · Seguridad agrícola. */
export function FaseAgricola(props: PropsFase) {
  const [externaLimpia, setExternaLimpia] = useState<string | null>(() => {
    const v = previo<boolean | null>(props.datosPrevios, "externaLimpia", null);
    return v === null ? null : v ? "si" : "no";
  });
  const [externaNota, setExternaNota] = useState(() =>
    previo(props.datosPrevios, "externaNota", "")
  );
  const [internaLimpia, setInternaLimpia] = useState<string | null>(() => {
    const v = previo<boolean | null>(props.datosPrevios, "internaLimpia", null);
    return v === null ? null : v ? "si" : "no";
  });
  const [internaNota, setInternaNota] = useState(() =>
    previo(props.datosPrevios, "internaNota", "")
  );

  const opciones = [
    { valor: "si", etiqueta: "Limpia", descripcion: "Sin contaminación visible" },
    { valor: "no", etiqueta: "Con hallazgos", descripcion: "Requiere anotación" },
  ];

  const falta =
    externaLimpia === null || internaLimpia === null
      ? "Contesta ambas revisiones"
      : externaLimpia === "no" && !externaNota.trim()
        ? "Describe el hallazgo externo"
        : internaLimpia === "no" && !internaNota.trim()
          ? "Describe el hallazgo interno"
          : null;

  return (
    <PantallaFase
      {...props}
      descripcion="Revisión de contaminación por plagas o materia vegetal."
      faltante={falta}
      recolectar={() => ({
        externaLimpia: externaLimpia === "si",
        externaNota,
        internaLimpia: internaLimpia === "si",
        internaNota,
      })}
    >
      <div className="flex flex-col gap-7">
        <div>
          <OptionCards
            nombre="agricola-externa"
            leyenda="Revisión externa"
            opciones={opciones}
            valor={externaLimpia}
            onChange={setExternaLimpia}
            columnas={2}
          />
          {externaLimpia === "no" && (
            <Field label="¿Qué se encontró?" required className="mt-3">
              {(p) => (
                <Textarea
                  {...p}
                  rows={3}
                  value={externaNota}
                  onChange={(e) => setExternaNota(e.target.value)}
                />
              )}
            </Field>
          )}
        </div>

        <div>
          <OptionCards
            nombre="agricola-interna"
            leyenda="Revisión interna"
            opciones={opciones}
            valor={internaLimpia}
            onChange={setInternaLimpia}
            columnas={2}
          />
          {internaLimpia === "no" && (
            <Field label="¿Qué se encontró?" required className="mt-3">
              {(p) => (
                <Textarea
                  {...p}
                  rows={3}
                  value={internaNota}
                  onChange={(e) => setInternaNota(e.target.value)}
                />
              )}
            </Field>
          )}
        </div>
      </div>
    </PantallaFase>
  );
}

type Comentario = { nombre: string; cargo: string; comentario: string };

/** Fase · Comentarios. Opcional por diseño: se puede pasar de largo. */
export function FaseComentarios(props: PropsFase) {
  const [comentarios, setComentarios] = useState<Comentario[]>(() =>
    previo<Comentario[]>(props.datosPrevios, "comentarios", [])
  );

  return (
    <PantallaFase
      {...props}
      descripcion="Observaciones que no caben en las fases anteriores. Es opcional."
      etiquetaBoton={comentarios.length === 0 ? "Sin comentarios, continuar" : "Guardar y continuar"}
      recolectar={() => ({
        comentarios: comentarios.filter((c) => c.comentario.trim().length > 0),
      })}
    >
      <div className="flex flex-col gap-2.5">
        {comentarios.map((c, i) => (
          <Card key={i} className="flex flex-col gap-2 p-3">
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <Input
                  value={c.nombre}
                  placeholder="Nombre"
                  onChange={(e) =>
                    setComentarios((p) =>
                      p.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x))
                    )
                  }
                />
                <Input
                  value={c.cargo}
                  placeholder="Cargo"
                  onChange={(e) =>
                    setComentarios((p) =>
                      p.map((x, j) => (j === i ? { ...x, cargo: e.target.value } : x))
                    )
                  }
                />
              </div>
              <button
                type="button"
                aria-label={`Quitar comentario ${i + 1}`}
                onClick={() => setComentarios((p) => p.filter((_, j) => j !== i))}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors active:bg-danger-50"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <Textarea
              rows={3}
              value={c.comentario}
              placeholder="Comentario"
              onChange={(e) =>
                setComentarios((p) =>
                  p.map((x, j) => (j === i ? { ...x, comentario: e.target.value } : x))
                )
              }
            />
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() =>
            setComentarios((p) => [...p, { nombre: "", cargo: "", comentario: "" }])
          }
          className="justify-start"
        >
          <Plus className="size-5" aria-hidden />
          Agregar comentario
        </Button>
      </div>
    </PantallaFase>
  );
}

type Lectura = { ubicacion: string; temperatura: string };

/**
 * Fase · Temperaturas de caja refrigerada.
 *
 * Solo aparece para transporte refrigerado; el motor la omite en el resto.
 * Se piden varias lecturas porque una sola en la puerta no dice nada: el
 * fondo de una caja mal enfriada puede estar diez grados arriba.
 */
export function FaseTemperaturas(props: PropsFase) {
  const [lecturas, setLecturas] = useState<Lectura[]>(() => {
    const previas = previo<Lectura[]>(props.datosPrevios, "lecturas", []);
    return previas.length > 0
      ? previas
      : // Arranca con los tres puntos habituales para que el inspector no
        // tenga que escribirlos cada vez.
        [
          { ubicacion: "Frente (cerca del equipo)", temperatura: "" },
          { ubicacion: "Centro", temperatura: "" },
          { ubicacion: "Fondo (puerta)", temperatura: "" },
        ];
  });

  const incompletas = lecturas.filter(
    (l) => !l.ubicacion.trim() || !l.temperatura.trim()
  ).length;

  const caja = props.contexto.unidad;

  return (
    <PantallaFase
      {...props}
      descripcion={
        caja
          ? `Lecturas del sistema de refrigeración de la caja ${caja}.`
          : "Lecturas del sistema de refrigeración."
      }
      faltante={
        incompletas > 0
          ? `Faltan ${incompletas} ${incompletas === 1 ? "lectura" : "lecturas"}`
          : null
      }
      recolectar={() => ({ lecturas })}
    >
      <div className="flex flex-col gap-2.5">
        {lecturas.map((l, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-start gap-2">
              <Thermometer
                className="mt-3 size-5 shrink-0 text-brand-600"
                aria-hidden
              />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={l.ubicacion}
                  placeholder="Dónde se midió"
                  onChange={(e) =>
                    setLecturas((p) =>
                      p.map((x, j) =>
                        j === i ? { ...x, ubicacion: e.target.value } : x
                      )
                    )
                  }
                />
                <Input
                  value={l.temperatura}
                  placeholder="Ej. -18.5 °C"
                  onChange={(e) =>
                    setLecturas((p) =>
                      p.map((x, j) =>
                        j === i ? { ...x, temperatura: e.target.value } : x
                      )
                    )
                  }
                />
              </div>
              {lecturas.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar lectura ${i + 1}`}
                  onClick={() => setLecturas((p) => p.filter((_, j) => j !== i))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors active:bg-danger-50"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              )}
            </div>
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() =>
            setLecturas((p) => [...p, { ubicacion: "", temperatura: "" }])
          }
          className="justify-start"
        >
          <Plus className="size-5" aria-hidden />
          Agregar lectura
        </Button>
      </div>
    </PantallaFase>
  );
}
