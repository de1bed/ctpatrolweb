"use client";

import { Check, PauseCircle, Plus, ShieldCheck, Trash2, Users, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { SignaturePad } from "@/components/inspection/signature-pad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { MAX_FIRMAS_ADICIONALES } from "@/lib/inspection/esquemas";
import { PASOS_VVTT, type PasoVvtt } from "@/lib/inspection/puntos";
import { GrabadoraVideo } from "@/components/inspection/video-recorder";
import { borrarFoto, fotosDePaso, guardarFoto, type FotoLocal } from "@/lib/media/almacen";
import {
  DURACION_MAXIMA,
  DURACION_MINIMA,
  type VideoCapturado,
} from "@/lib/media/video";

import { previo, type PropsFase } from "./tipos";

type Sello = { numero: string } & Record<PasoVvtt, boolean>;

const SELLO_NUEVO: Sello = {
  numero: "",
  ver: false,
  verificar: false,
  jalar: false,
  girar: false,
};

/**
 * Fase · Sellos, con protocolo VVTT.
 *
 * Los cuatro pasos —ver, verificar, jalar, girar— son obligatorios por norma
 * C-TPAT, y se marcan uno por uno a propósito. Un solo botón de "sello
 * revisado" invitaría a palomearlo sin haber jalado nada; obligar a cuatro
 * toques conscientes es justo el punto del protocolo.
 */
export function FaseSellos(
  props: PropsFase & { latitud?: number | null; longitud?: number | null }
) {
  const [sellos, setSellos] = useState<Sello[]>(() => {
    const previos = previo<Sello[]>(props.datosPrevios, "sellos", []);
    return previos.length > 0 ? previos : [{ ...SELLO_NUEVO }];
  });

  const [videos, setVideos] = useState<Record<string, FotoLocal>>({});
  const [grabando, setGrabando] = useState<number | null>(null);

  // Clips ya grabados de este paso, para no perderlos al volver.
  useEffect(() => {
    let vivo = true;
    fotosDePaso(props.inspeccionId, props.clavePaso).then((lista) => {
      if (!vivo) return;
      const porPunto: Record<string, FotoLocal> = {};
      for (const f of lista) porPunto[f.puntoClave] = f;
      setVideos(porPunto);
    });
    return () => {
      vivo = false;
    };
  }, [props.inspeccionId, props.clavePaso]);

  const urls = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const [clave, v] of Object.entries(videos)) {
      mapa[clave] = URL.createObjectURL(v.blob);
    }
    return mapa;
  }, [videos]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [urls]);

  function actualizar(i: number, cambios: Partial<Sello>) {
    setSellos((prev) => prev.map((s, j) => (j === i ? { ...s, ...cambios } : s)));
  }

  async function alGrabar(video: VideoCapturado, capturadoEn: string) {
    if (grabando === null) return;
    const clave = `sello_${grabando + 1}`;

    // Regrabar reemplaza: guardar los dos descartes llenaría el dispositivo.
    const anterior = videos[clave];
    if (anterior) await borrarFoto(anterior.clientId);

    const guardado = await guardarFoto({
      clientId: crypto.randomUUID(),
      tipo: "video",
      inspeccionId: props.inspeccionId,
      paso: props.clavePaso,
      puntoClave: clave,
      puntoNombre: `Sello ${sellos[grabando]?.numero || grabando + 1}`,
      blob: video.blob,
      mimeType: video.mimeType,
      // El clip no tiene dimensiones fijas conocidas aquí; el reporte lo
      // muestra con la relación de aspecto que traiga el archivo.
      ancho: 1,
      alto: 1,
      duracionSegundos: video.duracionSegundos,
      capturadaEn: capturadoEn,
      latitud: props.latitud ?? null,
      longitud: props.longitud ?? null,
    });

    setVideos((prev) => ({ ...prev, [clave]: guardado }));
    setGrabando(null);
  }

  const incompletos = sellos.filter(
    (s, i) =>
      !s.numero.trim() ||
      !s.ver ||
      !s.verificar ||
      !s.jalar ||
      !s.girar ||
      // El clip es parte del protocolo, no un extra: sin él no hay prueba de
      // que se jaló y giró.
      !videos[`sello_${i + 1}`]
  );

  const caja = props.contexto.unidad;

  return (
    <PantallaFase
      {...props}
      descripcion={
        caja
          ? `Sellos de la caja ${caja}. Marca los cuatro pasos en cada uno.`
          : "Marca los cuatro pasos del protocolo en cada sello."
      }
      faltante={
        incompletos.length > 0
          ? `Faltan datos en ${incompletos.length} ${incompletos.length === 1 ? "sello" : "sellos"}`
          : null
      }
      recolectar={() => ({ sellos })}
    >
      <div className="flex flex-col gap-3">
        {sellos.map((sello, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-2">
              <Field label={`Número de sello ${i + 1}`} required className="flex-1">
                {(p) => (
                  <Input
                    {...p}
                    value={sello.numero}
                    onChange={(e) => actualizar(i, { numero: e.target.value })}
                    placeholder="Ej. 0483712"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="numeric"
                  />
                )}
              </Field>

              {sellos.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar sello ${i + 1}`}
                  onClick={() => setSellos((p) => p.filter((_, j) => j !== i))}
                  className="mt-7 flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors active:bg-danger-50"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-ink-secondary">
                Protocolo VVTT
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-snug text-ink-secondary">
                {PASOS_VVTT.map((paso) => (
                  <li key={paso.clave}>
                    <span className="font-semibold text-ink">{paso.nombre}.</span>{" "}
                    {paso.pista}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm font-medium text-ink-secondary">
                Confirma cada paso
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PASOS_VVTT.map((paso) => {
                  const hecho = sello[paso.clave];
                  return (
                    <button
                      key={paso.clave}
                      type="button"
                      role="checkbox"
                      aria-checked={hecho}
                      aria-label={`${paso.nombre}: ${paso.pista}`}
                      onClick={() =>
                        actualizar(i, { [paso.clave]: !hecho } as Partial<Sello>)
                      }
                      className={cn(
                        "flex min-h-14 items-center gap-2.5 rounded-xl border-2 px-3 text-left transition-colors",
                        hecho
                          ? "border-ok-600 bg-ok-50 dark:bg-ok-500/10"
                          : "border-line bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                          hecho
                            ? "border-ok-600 bg-ok-600 text-white"
                            : "border-line-strong"
                        )}
                      >
                        {hecho && <Check className="size-4" strokeWidth={3} aria-hidden />}
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {paso.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Clip de evidencia ─────────────────────────────────────
                Cuatro palomas se marcan en tres segundos sin tocar nada. El
                video de la maniobra es lo que convierte el protocolo en algo
                verificable. */}
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium text-ink-secondary">
                Clip jalando y girando ({DURACION_MINIMA}-{DURACION_MAXIMA} s)
              </p>

              {videos[`sello_${i + 1}`] && urls[`sello_${i + 1}`] ? (
                <div className="flex items-center gap-3">
                  <video
                    src={urls[`sello_${i + 1}`]}
                    controls
                    playsInline
                    className="h-24 w-32 shrink-0 rounded-xl border border-ok-600 bg-black object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ok-700 dark:text-ok-500">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                      Grabado
                      {videos[`sello_${i + 1}`].duracionSegundos
                        ? ` · ${videos[`sello_${i + 1}`].duracionSegundos}s`
                        : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => setGrabando(i)}
                      className="mt-1 text-sm font-medium text-brand-600"
                    >
                      Volver a grabar
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  block
                  onClick={() => setGrabando(i)}
                  className="justify-start"
                >
                  <Video className="size-5" aria-hidden />
                  Grabar clip del sello
                </Button>
              )}
            </div>
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() => setSellos((p) => [...p, { ...SELLO_NUEVO }])}
          className="justify-start"
        >
          <Plus className="size-5" aria-hidden />
          Agregar otro sello
        </Button>
      </div>

      {grabando !== null && (
        <GrabadoraVideo
          selloNumero={sellos[grabando]?.numero ?? ""}
          latitud={props.latitud ?? null}
          longitud={props.longitud ?? null}
          onCapturar={alGrabar}
          onCerrar={() => setGrabando(null)}
        />
      )}
    </PantallaFase>
  );
}

/**
 * Fase · Firmas.
 *
 * Cierra la inspección. Después de esto el expediente queda inmutable para el
 * inspector, así que la pantalla lo dice antes de que firme, no después.
 */
export function FaseFirmas(
  props: PropsFase & {
    /**
     * Conductores capturados en su fase, el principal primero. El nombre de
     * quien firma se toma de aquí: pedirlo otra vez invitaba a escribirlo
     * distinto y el reporte quedaba con dos nombres para la misma persona.
     */
    conductores?: string[];
    /**
     * Inspección colectiva: quienes participaron (sin contar a quien cierra)
     * y, si no soy yo, quién hizo más fases.
     */
    colectiva?: {
      participantes: { perfilId: string; nombre: string }[];
      cierra: string | null;
    };
  }
) {
  const conductores = props.conductores ?? [];
  const previas = previo<{
    inspector?: { nombre?: string; firma?: string };
    conductor?: { nombre?: string; firma?: string };
  }>(props.datosPrevios, "inspector", {} as never);

  const guardadas = (props.datosPrevios ?? {}) as {
    inspector?: { nombre?: string; firma?: string };
    conductor?: { nombre?: string; firma?: string };
    adicionales?: { cargo?: string; nombre?: string; firma?: string }[];
    participantes?: { perfilId?: string; nombre?: string; firma?: string }[];
  };

  const [nombreInspector, setNombreInspector] = useState(
    guardadas.inspector?.nombre ?? props.contexto.nombreInspector
  );
  const [firmaInspector, setFirmaInspector] = useState<string | null>(
    guardadas.inspector?.firma ?? null
  );
  const [nombreConductor, setNombreConductor] = useState(
    guardadas.conductor?.nombre || conductores[0] || ""
  );
  const [firmaConductor, setFirmaConductor] = useState<string | null>(
    guardadas.conductor?.firma ?? null
  );

  // Firmas que pide la política de cada empresa (supervisor, caseta…). La
  // clave solo sirve para que React no confunda los lienzos al quitar una.
  const [adicionales, setAdicionales] = useState<FirmaAdicional[]>(() =>
    (guardadas.adicionales ?? []).map((f) => ({
      clave: crypto.randomUUID(),
      cargo: f.cargo ?? "",
      nombre: f.nombre ?? "",
      firma: f.firma ?? null,
    }))
  );

  function actualizarAdicional(clave: string, cambios: Partial<FirmaAdicional>) {
    setAdicionales((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  // Colectiva: una firma por participante, con su nombre ya puesto. Si una
  // ya se había capturado, se conserva.
  const [firmasEquipo, setFirmasEquipo] = useState<FirmaEquipo[]>(() =>
    (props.colectiva?.participantes ?? []).map((p) => {
      const previa = guardadas.participantes?.find((f) => f.perfilId === p.perfilId);
      return {
        perfilId: p.perfilId,
        nombre: previa?.nombre ?? p.nombre,
        firma: previa?.firma ?? null,
      };
    })
  );

  function actualizarEquipo(perfilId: string, cambios: Partial<FirmaEquipo>) {
    setFirmasEquipo((prev) =>
      prev.map((f) => (f.perfilId === perfilId ? { ...f, ...cambios } : f))
    );
  }

  void previas;

  const adicionalIncompleta = adicionales.findIndex(
    (f) => !f.cargo.trim() || !f.nombre.trim() || !f.firma
  );
  const equipoIncompleto = firmasEquipo.find((f) => !f.nombre.trim() || !f.firma);

  const falta =
    !nombreInspector.trim()
      ? "Falta el nombre del inspector"
      : !firmaInspector
        ? "Falta la firma del inspector"
        : !nombreConductor.trim()
          ? "Falta el nombre del conductor"
          : !firmaConductor
            ? "Falta la firma del conductor"
            : equipoIncompleto
              ? `Falta la firma de ${equipoIncompleto.nombre.trim() || "un participante"}`
              : adicionalIncompleta >= 0
              ? `Completa la firma adicional ${adicionalIncompleta + 1} o quítala`
              : null;

  return (
    <PantallaFase
      {...props}
      descripcion={
        adicionales.length > 0 || firmasEquipo.length > 0
          ? "Todas las firmas cierran la inspección."
          : "Ambas firmas cierran la inspección."
      }
      etiquetaBoton="Firmar y cerrar inspección"
      faltante={falta}
      recolectar={() => ({
        inspector: { nombre: nombreInspector.trim(), firma: firmaInspector },
        conductor: { nombre: nombreConductor.trim(), firma: firmaConductor },
        adicionales: adicionales.map((f) => ({
          cargo: f.cargo.trim(),
          nombre: f.nombre.trim(),
          firma: f.firma,
        })),
        participantes: firmasEquipo.map((f) => ({
          perfilId: f.perfilId,
          nombre: f.nombre.trim(),
          firma: f.firma,
        })),
      })}
    >
      <Card className="mb-5 flex items-start gap-3 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-warn-600" aria-hidden />
        <p className="text-sm text-ink-secondary">
          Al firmar, el expediente queda cerrado. Ya no vas a poder editarlo;
          solo un administrador puede reabrirlo. Revisa antes de firmar.
        </p>
      </Card>

      {props.colectiva && (
        <Card className="mb-5 flex items-start gap-3 border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
          <Users className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
          <div className="flex flex-col gap-1.5 text-sm text-ink-secondary">
            <p className="font-semibold text-ink">Inspección colectiva</p>
            {firmasEquipo.length > 0 ? (
              <p>
                Firman aquí, en este teléfono, todos los que participaron. A los demás
                les aparece un aviso para que vengan a firmar.
              </p>
            ) : (
              <p>Nadie más participó en esta inspección.</p>
            )}
            {props.colectiva.cierra && (
              <p className="font-medium text-warn-700 dark:text-warn-500">
                Se recomienda cerrar en el teléfono de {props.colectiva.cierra}, que hizo
                más fases. Si cierras aquí, todos deben firmar en este teléfono.
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Field label="Nombre del inspector" required>
            {(p) => (
              <Input
                {...p}
                value={nombreInspector}
                onChange={(e) => setNombreInspector(e.target.value)}
              />
            )}
          </Field>
          <SignaturePad
            etiqueta="Firma del inspector"
            valor={firmaInspector}
            onChange={setFirmaInspector}
          />
        </div>

        {firmasEquipo.map((f, i) => (
          <div
            key={f.perfilId}
            className="flex flex-col gap-3 rounded-2xl border border-brand-200 p-4 dark:border-brand-800"
          >
            <p className="text-sm font-medium text-ink-secondary">
              Inspector participante {i + 1}
            </p>
            <Field label="Nombre" required>
              {(p) => (
                <Input
                  {...p}
                  value={f.nombre}
                  onChange={(e) => actualizarEquipo(f.perfilId, { nombre: e.target.value })}
                  maxLength={200}
                />
              )}
            </Field>
            <SignaturePad
              etiqueta={`Firma de ${f.nombre.trim() || "participante"}`}
              valor={f.firma}
              onChange={(firma) => actualizarEquipo(f.perfilId, { firma })}
            />
          </div>
        ))}

        <div className="flex flex-col gap-3">
          {conductores.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-secondary">
                ¿Quién firma?
              </p>
              <div className="flex flex-wrap gap-2">
                {conductores.map((nombre) => (
                  <button
                    key={nombre}
                    type="button"
                    aria-pressed={nombreConductor === nombre}
                    onClick={() => setNombreConductor(nombre)}
                    className={cn(
                      "min-h-11 rounded-xl border-2 px-3.5 text-sm font-semibold transition-colors",
                      nombreConductor === nombre
                        ? "border-brand-600 bg-brand-50 text-ink dark:bg-brand-950/50"
                        : "border-line bg-surface text-ink-secondary"
                    )}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field
            label="Nombre del conductor"
            required
            hint={
              conductores.includes(nombreConductor)
                ? "Tomado de la fase Conductor."
                : undefined
            }
          >
            {(p) => (
              <Input
                {...p}
                value={nombreConductor}
                onChange={(e) => setNombreConductor(e.target.value)}
              />
            )}
          </Field>
          <SignaturePad
            etiqueta="Firma del conductor"
            valor={firmaConductor}
            onChange={setFirmaConductor}
          />
        </div>

        {adicionales.map((f, i) => (
          <div
            key={f.clave}
            className="flex flex-col gap-3 rounded-2xl border border-line p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink-secondary">
                Firma adicional {i + 1}
              </p>
              <button
                type="button"
                aria-label={`Quitar firma adicional ${i + 1}`}
                onClick={() =>
                  setAdicionales((prev) => prev.filter((x) => x.clave !== f.clave))
                }
                className="flex size-11 items-center justify-center rounded-lg text-danger-600 active:bg-danger-50"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <Field label="Cargo" required ayuda="Cómo aparece en el reporte. Ej. Supervisor, Caseta norte.">
              {(p) => (
                <Input
                  {...p}
                  value={f.cargo}
                  onChange={(e) => actualizarAdicional(f.clave, { cargo: e.target.value })}
                  placeholder="Supervisor"
                  maxLength={120}
                />
              )}
            </Field>
            <Field label="Nombre" required>
              {(p) => (
                <Input
                  {...p}
                  value={f.nombre}
                  onChange={(e) => actualizarAdicional(f.clave, { nombre: e.target.value })}
                  maxLength={200}
                />
              )}
            </Field>
            <SignaturePad
              etiqueta={f.cargo.trim() ? `Firma de ${f.cargo.trim()}` : "Firma"}
              valor={f.firma}
              onChange={(firma) => actualizarAdicional(f.clave, { firma })}
            />
          </div>
        ))}

        {adicionales.length < MAX_FIRMAS_ADICIONALES && (
          <Button
            variant="secondary"
            onClick={() =>
              setAdicionales((prev) => [
                ...prev,
                { clave: crypto.randomUUID(), cargo: "", nombre: "", firma: null },
              ])
            }
            className="justify-start"
          >
            <Plus className="size-5" aria-hidden />
            Agregar firma
          </Button>
        )}
      </div>
    </PantallaFase>
  );
}

type FirmaEquipo = {
  perfilId: string;
  nombre: string;
  firma: string | null;
};

type FirmaAdicional = {
  clave: string;
  cargo: string;
  nombre: string;
  firma: string | null;
};

/**
 * Fase · Pausa de carga.
 *
 * La unidad sale a cargar y vuelve sellada. Es un punto de corte real de la
 * operación, no un paso de captura: aquí no se pide nada, se confirma.
 */
export function FasePausa(props: PropsFase) {
  return (
    <PantallaFase
      {...props}
      descripcion="Punto de corte: la unidad continúa con la descarga y regresa sellada."
      etiquetaBoton="La unidad ya regresó, continuar"
      recolectar={() => ({})}
    >
      <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <PauseCircle className="size-12 text-warn-600" aria-hidden />
        <p className="text-lg font-semibold text-ink">
          Inspección previa terminada
        </p>
        <p className="max-w-sm text-ink-secondary">
          Puedes salir de aquí y retomar cuando la unidad regrese. Lo capturado
          hasta ahora ya está guardado.
        </p>
        <p className="max-w-sm text-sm text-ink-muted">
          Si continúas, se entiende que la unidad ya volvió y sigue la revisión
          de sellos. La seguridad agrícola debió quedar hecha antes de esta
          pausa.
        </p>
      </Card>
    </PantallaFase>
  );
}
