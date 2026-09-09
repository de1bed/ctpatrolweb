"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CatalogPicker, type SeleccionCatalogo } from "@/components/inspection/catalog-picker";
import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { previo, type PropsFase } from "./tipos";

/**
 * Fases que seleccionan del catálogo.
 *
 * Transportista, conductor, tractor y placas de remolque siguen el mismo
 * patrón: buscar, elegir o registrar, y capturar un dato extra.
 */

type PropsConPermisos = PropsFase & {
  permisos: {
    puedeCrearCliente: boolean;
    puedeCrearConductor: boolean;
    puedeCrearTractor: boolean;
    puedeCrearContenedor: boolean;
  };
};

export function FaseCliente(props: PropsConPermisos) {
  const [sel, setSel] = useState<SeleccionCatalogo | null>(
    () => {
      const nombre = previo(props.datosPrevios, "clienteNombre", "");
      return nombre
        ? { id: previo<string | null>(props.datosPrevios, "clienteId", null), nombre }
        : null;
    }
  );

  return (
    <PantallaFase
      {...props}
      descripcion="La empresa transportista dueña de la unidad."
      faltante={!sel ? "Selecciona el transportista" : null}
      recolectar={() => ({
        clienteId: sel?.id ?? null,
        clienteNombre: sel?.nombre ?? "",
      })}
    >
      <CatalogPicker
        tipo="cliente"
        etiqueta="Transportista"
        placeholder="Buscar por nombre"
        etiquetaDetalle="RFC (opcional)"
        puedeCrear={props.permisos.puedeCrearCliente}
        seleccionado={sel}
        onSeleccionar={setSel}
      />
    </PantallaFase>
  );
}

type ExtraConductor = {
  id: string | null;
  nombre: string;
  licencia: string;
};

export function FaseConductor(props: PropsConPermisos) {
  const [sel, setSel] = useState<SeleccionCatalogo | null>(() => {
    const nombre = previo(props.datosPrevios, "nombre", "");
    const licencia = previo(props.datosPrevios, "licencia", "");
    return nombre
      ? {
          id: previo<string | null>(props.datosPrevios, "conductorId", null),
          nombre,
          detalle: licencia || null,
        }
      : null;
  });
  const [licencia, setLicencia] = useState(() =>
    previo(props.datosPrevios, "licencia", "")
  );
  const [adicionales, setAdicionales] = useState<ExtraConductor[]>(() =>
    previo<
      Array<{
        conductorId?: string | null;
        id?: string | null;
        nombre: string;
        licencia?: string;
      }>
    >(props.datosPrevios, "adicionales", []).map((c) => ({
      id: c.id ?? c.conductorId ?? null,
      nombre: c.nombre,
      licencia: c.licencia ?? "",
    }))
  );

  function elegirPrincipal(v: SeleccionCatalogo | null) {
    setSel(v);
    setLicencia(v?.detalle ?? "");
  }

  return (
    <PantallaFase
      {...props}
      descripcion="Quién conduce la unidad. Si viaja más de uno, registra al principal y a los adicionales."
      faltante={!sel ? "Selecciona el conductor principal" : null}
      recolectar={() => ({
        conductorId: sel?.id ?? null,
        nombre: sel?.nombre ?? "",
        licencia,
        adicionales: adicionales
          .filter((c) => c.nombre.trim())
          .map((c) => ({
            conductorId: c.id,
            nombre: c.nombre,
            licencia: c.licencia,
          })),
      })}
    >
      <div className="flex flex-col gap-5">
        <CatalogPicker
          tipo="conductor"
          etiqueta="Conductor principal"
          placeholder="Buscar por nombre"
          etiquetaDetalle="Número de licencia"
          ayuda="Nombre como aparece en la licencia de conducir."
          ayudaDetalle="Número impreso en la licencia federal o estatal. Si ya está en el catálogo, se recupera solo."
          puedeCrear={props.permisos.puedeCrearConductor}
          seleccionado={sel}
          onSeleccionar={elegirPrincipal}
        />

        {sel && !licencia.trim() && (
          <Field
            label="Número de licencia"
            hint="No estaba en el catálogo. Captúralo una vez."
            ayuda="Número de la licencia de conducir. Está en el anverso, junto a la foto."
          >
            {(p) => (
              <Input
                {...p}
                value={licencia}
                onChange={(e) => setLicencia(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
        )}

        {adicionales.map((extra, i) => (
          <div
            key={`${extra.id ?? "n"}-${i}`}
            className="flex flex-col gap-3 rounded-2xl border border-line p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink-secondary">
                Conductor adicional {i + 1}
              </p>
              <button
                type="button"
                aria-label={`Quitar conductor adicional ${i + 1}`}
                onClick={() =>
                  setAdicionales((prev) => prev.filter((_, j) => j !== i))
                }
                className="flex size-11 items-center justify-center rounded-lg text-danger-600 active:bg-danger-50"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <CatalogPicker
              tipo="conductor"
              etiqueta="Nombre"
              placeholder="Buscar por nombre"
              etiquetaDetalle="Número de licencia"
              puedeCrear={props.permisos.puedeCrearConductor}
              seleccionado={
                extra.nombre
                  ? { id: extra.id, nombre: extra.nombre, detalle: extra.licencia || null }
                  : null
              }
              onSeleccionar={(v) =>
                setAdicionales((prev) =>
                  prev.map((c, j) =>
                    j === i
                      ? {
                          id: v?.id ?? null,
                          nombre: v?.nombre ?? "",
                          licencia: v?.detalle ?? "",
                        }
                      : c
                  )
                )
              }
            />
            {extra.nombre && !extra.licencia.trim() && (
              <Field label="Número de licencia">
                {(p) => (
                  <Input
                    {...p}
                    value={extra.licencia}
                    onChange={(e) =>
                      setAdicionales((prev) =>
                        prev.map((c, j) =>
                          j === i ? { ...c, licencia: e.target.value } : c
                        )
                      )
                    }
                    autoCapitalize="characters"
                  />
                )}
              </Field>
            )}
          </div>
        ))}

        {sel && (
          <Button
            variant="secondary"
            onClick={() =>
              setAdicionales((prev) => [
                ...prev,
                { id: null, nombre: "", licencia: "" },
              ])
            }
            className="justify-start"
          >
            <Plus className="size-5" aria-hidden />
            Agregar conductor adicional
          </Button>
        )}
      </div>
    </PantallaFase>
  );
}

export function FaseTractor(props: PropsConPermisos) {
  const [sel, setSel] = useState<SeleccionCatalogo | null>(() => {
    const numero = previo(props.datosPrevios, "numero", "");
    const placas = previo(props.datosPrevios, "placas", "");
    return numero
      ? {
          id: previo<string | null>(props.datosPrevios, "tractorId", null),
          nombre: numero,
          detalle: placas || null,
        }
      : null;
  });
  const [placas, setPlacas] = useState(() =>
    previo(props.datosPrevios, "placas", "")
  );

  function elegir(v: SeleccionCatalogo | null) {
    setSel(v);
    setPlacas(v?.detalle ?? "");
  }

  return (
    <PantallaFase
      {...props}
      descripcion="La unidad motriz."
      faltante={!sel ? "Selecciona el tractor" : null}
      recolectar={() => ({
        tractorId: sel?.id ?? null,
        numero: sel?.nombre ?? "",
        placas,
      })}
    >
      <div className="flex flex-col gap-5">
        <CatalogPicker
          tipo="tractor"
          etiqueta="Tractor"
          placeholder="Buscar por número de unidad"
          etiquetaDetalle="Placas"
          ayuda="Número económico o de unidad de la tractocamión. Suele estar pintado en las puertas de la cabina o en el costado. No es el número de placas."
          ayudaDetalle="Placas metálicas de la unidad motriz. Si ya están en el catálogo, se recuperan solas."
          puedeCrear={props.permisos.puedeCrearTractor}
          seleccionado={sel}
          onSeleccionar={elegir}
        />

        {sel && !placas.trim() && (
          <Field
            label="Placas"
            hint="No estaban en el catálogo. Captúralas una vez."
            ayuda="Placas de la unidad motriz, como aparecen en la lámina frontal o trasera."
          >
            {(p) => (
              <Input
                {...p}
                value={placas}
                onChange={(e) => setPlacas(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
        )}
      </div>
    </PantallaFase>
  );
}

export function FasePlacasRemolque(props: PropsConPermisos) {
  const [sel, setSel] = useState<SeleccionCatalogo | null>(() => {
    const numero = previo(props.datosPrevios, "numero", "");
    const placas = previo(props.datosPrevios, "placas", "");
    return numero
      ? {
          id: previo<string | null>(props.datosPrevios, "contenedorId", null),
          nombre: numero,
          detalle: placas || null,
        }
      : null;
  });
  const [placas, setPlacas] = useState(() =>
    previo(props.datosPrevios, "placas", "")
  );

  const caja = props.contexto.unidad;

  function elegir(v: SeleccionCatalogo | null) {
    setSel(v);
    setPlacas(v?.detalle ?? "");
  }

  return (
    <PantallaFase
      {...props}
      descripcion={
        caja
          ? `Identificación de la caja ${caja}.`
          : "Identificación de la unidad de arrastre."
      }
      faltante={!sel ? "Selecciona o registra la unidad" : null}
      recolectar={() => ({
        contenedorId: sel?.id ?? null,
        numero: sel?.nombre ?? "",
        placas,
      })}
    >
      <div className="flex flex-col gap-5">
        <CatalogPicker
          tipo="contenedor"
          etiqueta="Número de unidad"
          placeholder="Buscar por número"
          etiquetaDetalle="Placas"
          ayuda="Identificador de la caja, contenedor o remolque (número de caja o contenedor). Suele estar pintado en el costado o en la placa de identificación. No es el número de placas."
          ayudaDetalle="Placas del remolque o contenedor. Si ya están en el catálogo, se recuperan solas."
          puedeCrear={props.permisos.puedeCrearContenedor}
          seleccionado={sel}
          onSeleccionar={elegir}
        />

        {sel && !placas.trim() && (
          <Field
            label="Placas"
            hint="No estaban en el catálogo. Captúralas una vez."
          >
            {(p) => (
              <Input
                {...p}
                value={placas}
                onChange={(e) => setPlacas(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
        )}
      </div>
    </PantallaFase>
  );
}
