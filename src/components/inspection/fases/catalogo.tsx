"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";

import {
  CapturaIdentificacion,
  type FotoServidor,
} from "@/components/inspection/captura-identificacion";
import { CatalogPicker, type SeleccionCatalogo } from "@/components/inspection/catalog-picker";
import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PUNTO_LICENCIA_PRINCIPAL, PUNTO_PLACAS } from "@/lib/inspection/identificacion";

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

/**
 * Lo que necesitan las fases con foto de identificación (licencia o placas).
 * Todo opcional: sin ello la fase funciona igual que antes, solo sin foto.
 */
type PropsConFoto = PropsConPermisos & {
  latitud?: number | null;
  longitud?: number | null;
  /** La empresa tiene IA autorizada, encendida y con créditos. */
  iaHabilitada?: boolean;
  /** Fotos ya subidas de este paso, la más reciente por punto. */
  fotosServidor?: Record<string, FotoServidor>;
};

/**
 * Qué puntos de identificación ya tienen foto.
 *
 * La foto de licencia y de placas es obligatoria: sin ella la fase no deja
 * continuar. Cada CapturaIdentificacion reporta su punto por onTieneFoto.
 */
function useFotosTomadas() {
  const [conFoto, setConFoto] = useState<ReadonlySet<string>>(() => new Set());

  const marcar = useCallback((clave: string, tiene: boolean) => {
    setConFoto((prev) => {
      if (prev.has(clave) === tiene) return prev;
      const siguiente = new Set(prev);
      if (tiene) siguiente.add(clave);
      else siguiente.delete(clave);
      return siguiente;
    });
  }, []);

  return { tiene: (clave: string) => conFoto.has(clave), marcar };
}

function mismoNombre(a: string, b: string): boolean {
  const normal = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  return normal(a) === normal(b);
}

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
  /** Punto de su foto de licencia. Estable aunque cambie su posición. */
  fotoClave: string;
  /** Nombre leído de su licencia, para buscarlo en el catálogo. */
  sugerencia?: string;
  /** Número leído con IA; manda sobre el del catálogo al elegirlo. */
  licenciaLeida?: string;
};

export function FaseConductor(props: PropsConFoto) {
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
        fotoClave?: string;
      }>
    >(props.datosPrevios, "adicionales", []).map((c, i) => ({
      id: c.id ?? c.conductorId ?? null,
      nombre: c.nombre,
      licencia: c.licencia ?? "",
      // Los capturados antes de que existiera la foto no traen clave; se les
      // da una fija por posición para que no cambie entre renders.
      fotoClave: c.fotoClave || `licencia-adicional-${i + 1}`,
    }))
  );

  // Lo que la IA leyó de la licencia del principal.
  const [sugerencia, setSugerencia] = useState<string | undefined>(undefined);
  const [licenciaLeida, setLicenciaLeida] = useState<string | null>(null);
  const [nombreLeido, setNombreLeido] = useState<string | null>(null);

  const latitud = props.latitud ?? null;
  const longitud = props.longitud ?? null;
  const ia = props.iaHabilitada ?? false;

  function elegirPrincipal(v: SeleccionCatalogo | null) {
    setSel(v);
    // La licencia que se tiene en la mano manda sobre la del catálogo.
    setLicencia(licenciaLeida ?? v?.detalle ?? "");
  }

  function actualizarExtra(i: number, cambios: Partial<ExtraConductor>) {
    setAdicionales((prev) => prev.map((c, j) => (j === i ? { ...c, ...cambios } : c)));
  }

  const nombreNoCoincide =
    sel && nombreLeido && !mismoNombre(sel.nombre, nombreLeido) ? nombreLeido : null;

  const fotos = useFotosTomadas();
  // Solo cuentan los adicionales con nombre: los vacíos no se guardan.
  const adicionalSinFoto = adicionales.findIndex(
    (c) => c.nombre.trim() && !fotos.tiene(c.fotoClave)
  );
  const faltante = !sel
    ? "Selecciona el conductor principal"
    : !fotos.tiene(PUNTO_LICENCIA_PRINCIPAL)
      ? "Toma la foto de la licencia del conductor principal"
      : adicionalSinFoto >= 0
        ? `Toma la foto de la licencia del conductor adicional ${adicionalSinFoto + 1}`
        : null;

  return (
    <PantallaFase
      {...props}
      descripcion="Quién conduce la unidad. Si viaja más de uno, registra al principal y a los adicionales."
      faltante={faltante}
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
            fotoClave: c.fotoClave,
          })),
      })}
    >
      <div className="flex flex-col gap-5">
        <CapturaIdentificacion
          inspeccionId={props.inspeccionId}
          clavePaso={props.clavePaso}
          puntoClave={PUNTO_LICENCIA_PRINCIPAL}
          puntoNombre="Licencia del conductor principal"
          etiquetaBoton="Tomar foto de la licencia"
          latitud={latitud}
          longitud={longitud}
          fotoServidor={props.fotosServidor?.[PUNTO_LICENCIA_PRINCIPAL]}
          tipoLectura="licencia"
          iaHabilitada={ia}
          onTieneFoto={(t) => fotos.marcar(PUNTO_LICENCIA_PRINCIPAL, t)}
          onLectura={(d) => {
            const numero = d.numero?.trim();
            const nombre = d.nombre?.trim();
            if (numero) {
              setLicencia(numero);
              setLicenciaLeida(numero);
            }
            if (nombre) {
              setNombreLeido(nombre);
              if (!sel) setSugerencia(nombre);
            }
          }}
        />

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
          sugerencia={sugerencia}
        />

        {nombreNoCoincide && (
          <p className="flex items-start gap-2 rounded-xl border border-warn-500/40 bg-warn-50 px-4 py-3 text-sm text-ink-secondary dark:bg-warn-500/10">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-600" aria-hidden />
            <span>
              La licencia dice «{nombreNoCoincide}». Verifica que sea el
              conductor seleccionado.
            </span>
          </p>
        )}

        {sel && (
          <Field
            label="Número de licencia"
            hint={
              sel.detalle
                ? undefined
                : "No estaba en el catálogo. Captúralo una vez."
            }
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
            key={extra.fotoClave}
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
            <CapturaIdentificacion
              inspeccionId={props.inspeccionId}
              clavePaso={props.clavePaso}
              puntoClave={extra.fotoClave}
              puntoNombre="Licencia de conductor adicional"
              etiquetaBoton="Tomar foto de la licencia"
              latitud={latitud}
              longitud={longitud}
              fotoServidor={props.fotosServidor?.[extra.fotoClave]}
              tipoLectura="licencia"
              iaHabilitada={ia}
              onTieneFoto={(t) => fotos.marcar(extra.fotoClave, t)}
              onLectura={(d) => {
                const numero = d.numero?.trim();
                const nombre = d.nombre?.trim();
                actualizarExtra(i, {
                  ...(numero ? { licencia: numero, licenciaLeida: numero } : {}),
                  ...(nombre && !extra.nombre ? { sugerencia: nombre } : {}),
                });
              }}
            />
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
              sugerencia={extra.sugerencia}
              onSeleccionar={(v) =>
                actualizarExtra(i, {
                  id: v?.id ?? null,
                  nombre: v?.nombre ?? "",
                  licencia: extra.licenciaLeida ?? v?.detalle ?? "",
                })
              }
            />
            {extra.nombre && (
              <Field label="Número de licencia">
                {(p) => (
                  <Input
                    {...p}
                    value={extra.licencia}
                    onChange={(e) => actualizarExtra(i, { licencia: e.target.value })}
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
                {
                  id: null,
                  nombre: "",
                  licencia: "",
                  fotoClave: `licencia-${crypto.randomUUID()}`,
                },
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

export function FaseTractor(props: PropsConFoto) {
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
  // Las placas leídas de la foto mandan sobre las del catálogo: son las que
  // trae la unidad hoy.
  const [placasLeidas, setPlacasLeidas] = useState<string | null>(null);

  function elegir(v: SeleccionCatalogo | null) {
    setSel(v);
    setPlacas(placasLeidas ?? v?.detalle ?? "");
  }

  const fotos = useFotosTomadas();

  return (
    <PantallaFase
      {...props}
      descripcion="La unidad motriz."
      faltante={
        !sel
          ? "Selecciona el tractor"
          : !fotos.tiene(PUNTO_PLACAS)
            ? "Toma la foto de las placas del tractor"
            : null
      }
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

        <CapturaIdentificacion
          inspeccionId={props.inspeccionId}
          clavePaso={props.clavePaso}
          puntoClave={PUNTO_PLACAS}
          puntoNombre="Placas del tractor"
          etiquetaBoton="Tomar foto de las placas"
          latitud={props.latitud ?? null}
          longitud={props.longitud ?? null}
          fotoServidor={props.fotosServidor?.[PUNTO_PLACAS]}
          tipoLectura="placas"
          iaHabilitada={props.iaHabilitada ?? false}
          onTieneFoto={(t) => fotos.marcar(PUNTO_PLACAS, t)}
          onLectura={(d) => {
            const numero = d.numero?.trim();
            if (!numero) return;
            setPlacas(numero);
            setPlacasLeidas(numero);
          }}
        />

        {sel && (
          <Field
            label="Placas"
            hint={sel.detalle ? undefined : "No estaban en el catálogo. Captúralas una vez."}
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

export function FasePlacasRemolque(props: PropsConFoto) {
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
  const [placasLeidas, setPlacasLeidas] = useState<string | null>(null);

  const caja = props.contexto.unidad;

  function elegir(v: SeleccionCatalogo | null) {
    setSel(v);
    setPlacas(placasLeidas ?? v?.detalle ?? "");
  }

  const fotos = useFotosTomadas();

  return (
    <PantallaFase
      {...props}
      descripcion={
        caja
          ? `Identificación de la caja ${caja}.`
          : "Identificación de la unidad de arrastre."
      }
      faltante={
        !sel
          ? "Selecciona o registra la unidad"
          : !fotos.tiene(PUNTO_PLACAS)
            ? "Toma la foto de las placas"
            : null
      }
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

        <CapturaIdentificacion
          inspeccionId={props.inspeccionId}
          clavePaso={props.clavePaso}
          puntoClave={PUNTO_PLACAS}
          puntoNombre={caja ? `Placas de la caja ${caja}` : "Placas del remolque"}
          etiquetaBoton="Tomar foto de las placas"
          latitud={props.latitud ?? null}
          longitud={props.longitud ?? null}
          fotoServidor={props.fotosServidor?.[PUNTO_PLACAS]}
          tipoLectura="placas"
          iaHabilitada={props.iaHabilitada ?? false}
          onTieneFoto={(t) => fotos.marcar(PUNTO_PLACAS, t)}
          onLectura={(d) => {
            const numero = d.numero?.trim();
            if (!numero) return;
            setPlacas(numero);
            setPlacasLeidas(numero);
          }}
        />

        {sel && (
          <Field
            label="Placas"
            hint={sel.detalle ? undefined : "No estaban en el catálogo. Captúralas una vez."}
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
