"use client";

import { useState } from "react";

import { CatalogPicker } from "@/components/inspection/catalog-picker";
import { PantallaFase } from "@/components/inspection/phase-shell";
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
  const [sel, setSel] = useState<{ id: string | null; nombre: string } | null>(
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

export function FaseConductor(props: PropsConPermisos) {
  const [sel, setSel] = useState<{ id: string | null; nombre: string } | null>(
    () => {
      const nombre = previo(props.datosPrevios, "nombre", "");
      return nombre
        ? { id: previo<string | null>(props.datosPrevios, "conductorId", null), nombre }
        : null;
    }
  );
  const [licencia, setLicencia] = useState(() =>
    previo(props.datosPrevios, "licencia", "")
  );

  return (
    <PantallaFase
      {...props}
      descripcion="Quién conduce la unidad."
      faltante={!sel ? "Selecciona el conductor" : null}
      recolectar={() => ({
        conductorId: sel?.id ?? null,
        nombre: sel?.nombre ?? "",
        licencia,
      })}
    >
      <div className="flex flex-col gap-5">
        <CatalogPicker
          tipo="conductor"
          etiqueta="Conductor"
          placeholder="Buscar por nombre"
          etiquetaDetalle="Número de licencia"
          puedeCrear={props.permisos.puedeCrearConductor}
          seleccionado={sel}
          onSeleccionar={setSel}
        />

        {sel && (
          <Field label="Número de licencia" hint="Como aparece en el documento">
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
      </div>
    </PantallaFase>
  );
}

export function FaseTractor(props: PropsConPermisos) {
  const [sel, setSel] = useState<{ id: string | null; nombre: string } | null>(
    () => {
      const numero = previo(props.datosPrevios, "numero", "");
      return numero
        ? { id: previo<string | null>(props.datosPrevios, "tractorId", null), nombre: numero }
        : null;
    }
  );
  const [placas, setPlacas] = useState(() =>
    previo(props.datosPrevios, "placas", "")
  );

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
          puedeCrear={props.permisos.puedeCrearTractor}
          seleccionado={sel}
          onSeleccionar={setSel}
        />

        {sel && (
          <Field label="Placas">
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
  const [sel, setSel] = useState<{ id: string | null; nombre: string } | null>(
    () => {
      const numero = previo(props.datosPrevios, "numero", "");
      return numero
        ? { id: previo<string | null>(props.datosPrevios, "contenedorId", null), nombre: numero }
        : null;
    }
  );
  const [placas, setPlacas] = useState(() =>
    previo(props.datosPrevios, "placas", "")
  );

  const caja = props.contexto.unidad;

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
          puedeCrear={props.permisos.puedeCrearContenedor}
          seleccionado={sel}
          onSeleccionar={setSel}
        />

        {sel && (
          <Field label="Placas">
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
