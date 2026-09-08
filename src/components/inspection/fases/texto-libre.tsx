"use client";

import { Plus, Thermometer, Trash2 } from "lucide-react";
import { useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import { previo, type PropsFase } from "./tipos";

type OtroDoc = { titulo: string; numero: string };

/** Fase · Documentos de entrada. */
export function FaseDocumentos(props: PropsFase & { soloLectura?: boolean }) {
  const [factura, setFactura] = useState(() => previo(props.datosPrevios, "factura", ""));
  const [bl, setBl] = useState(() => previo(props.datosPrevios, "billOfLading", ""));
  const [pedimento, setPedimento] = useState(() => previo(props.datosPrevios, "pedimento", ""));
  const [sellos, setSellos] = useState(() => previo(props.datosPrevios, "sellosFiscales", ""));
  const [otros, setOtros] = useState<OtroDoc[]>(() =>
    previo<OtroDoc[]>(props.datosPrevios, "otros", [])
  );

  const bloqueado = props.soloLectura ?? false;

  return (
    <PantallaFase
      {...props}
      descripcion={
        bloqueado
          ? "Estos datos los precargó tu administrador. Solo puedes consultarlos."
          : "Documentos que acompañan la carga. Deja en blanco lo que no aplique."
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
        <Field label="Factura">
          {(p) => (
            <Input {...p} value={factura} disabled={bloqueado} onChange={(e) => setFactura(e.target.value)} />
          )}
        </Field>

        <Field label="Bill of Lading">
          {(p) => <Input {...p} value={bl} disabled={bloqueado} onChange={(e) => setBl(e.target.value)} />}
        </Field>

        <Field label="Pedimento">
          {(p) => (
            <Input {...p} value={pedimento} disabled={bloqueado} onChange={(e) => setPedimento(e.target.value)} />
          )}
        </Field>

        <Field label="Sellos fiscales">
          {(p) => (
            <Input {...p} value={sellos} disabled={bloqueado} onChange={(e) => setSellos(e.target.value)} />
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
                  />
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
