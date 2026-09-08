"use client";

import { BookOpen, Camera, Check, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnalisisIA } from "@/components/inspection/ai-analysis";
import { CamaraPantallaCompleta } from "@/components/inspection/camera";
import { GuideSheet } from "@/components/inspection/guide-sheet";
import { PantallaFase } from "@/components/inspection/phase-shell";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  PUNTOS_POR_GRUPO,
  type Calificacion,
  type GrupoPuntos,
} from "@/lib/inspection/puntos";
import { guiaDe } from "@/lib/inspection/guias";
import { borrarFoto, fotosDePaso, guardarFoto, type FotoLocal } from "@/lib/media/almacen";
import type { FotoCapturada } from "@/lib/media/camara";
import type { Analisis } from "@/lib/ai/vision";

import { previo, type PropsFase } from "./tipos";

type EstadoPunto = {
  calificacion: Calificacion | null;
  nota: string;
  noAplica: boolean;
};

const VACIO: EstadoPunto = { calificacion: null, nota: "", noAplica: false };

const BOTONES: { valor: Calificacion; etiqueta: string; clases: string }[] = [
  {
    valor: "bueno",
    etiqueta: "Bueno",
    clases: "border-ok-600 bg-ok-600 text-white",
  },
  {
    valor: "regular",
    etiqueta: "Regular",
    clases: "border-warn-600 bg-warn-600 text-white",
  },
  {
    valor: "malo",
    etiqueta: "Malo",
    clases: "border-danger-600 bg-danger-600 text-white",
  },
];

/**
 * Fases de inspección visual: tractor (16 puntos), interna (6) y externa (19).
 *
 * Cada punto necesita foto y calificación. La foto se guarda en IndexedDB en
 * el instante en que se toma, antes de cualquier intento de subida: si el
 * inspector se queda sin señal, sin batería o cierra la pestaña, la evidencia
 * ya está a salvo en el dispositivo.
 */
export function FaseVisual(
  props: PropsFase & {
    grupo: GrupoPuntos;
    latitud: number | null;
    longitud: number | null;
    /** Evidencia ya subida, indexada por punto. Habilita el análisis con IA. */
    evidenciaSubida?: Record<string, { id: string; analisis: unknown }>;
  }
) {
  const puntos = PUNTOS_POR_GRUPO[props.grupo];

  const [estados, setEstados] = useState<Record<string, EstadoPunto>>(() => {
    const guardados = previo<Record<string, EstadoPunto>>(
      props.datosPrevios,
      "puntos",
      {}
    );
    const inicial: Record<string, EstadoPunto> = {};
    for (const p of puntos) {
      inicial[p.clave] = { ...VACIO, ...(guardados[p.clave] ?? {}) };
    }
    return inicial;
  });

  const [fotos, setFotos] = useState<Record<string, FotoLocal>>({});
  const [capturando, setCapturando] = useState<string | null>(null);
  const [guiaAbierta, setGuiaAbierta] = useState<string | null>(null);

  // ── Fotos ya guardadas de este paso ─────────────────────────────────────
  useEffect(() => {
    let vivo = true;

    fotosDePaso(props.inspeccionId, props.clavePaso).then((lista) => {
      if (!vivo) return;
      const porPunto: Record<string, FotoLocal> = {};
      for (const f of lista) porPunto[f.puntoClave] = f;
      setFotos(porPunto);
    });

    return () => {
      vivo = false;
    };
  }, [props.inspeccionId, props.clavePaso]);

  // Las URLs se DERIVAN de las fotos, no son estado aparte: calcularlas en un
  // efecto y guardarlas con setState provoca un render extra en cada cambio.
  const urls = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const [clave, foto] of Object.entries(fotos)) {
      mapa[clave] = URL.createObjectURL(foto.blob);
    }
    return mapa;
  }, [fotos]);

  // Pero sí hay que revocarlas: cada URL retiene su blob en memoria, y con 19
  // fotos abiertas eso se nota en un teléfono modesto.
  useEffect(() => {
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [urls]);

  const puntoActivo = useMemo(
    () => puntos.find((p) => p.clave === capturando) ?? null,
    [capturando, puntos]
  );

  async function alCapturar(foto: FotoCapturada, capturadaEn: string) {
    if (!puntoActivo) return;

    // Reemplazar la foto de un punto borra la anterior: guardar las dos
    // llenaría el dispositivo con descartes que nadie va a ver.
    const anterior = fotos[puntoActivo.clave];
    if (anterior) await borrarFoto(anterior.clientId);

    const guardada = await guardarFoto({
      clientId: crypto.randomUUID(),
      inspeccionId: props.inspeccionId,
      paso: props.clavePaso,
      puntoClave: puntoActivo.clave,
      puntoNombre: puntoActivo.nombre,
      blob: foto.blob,
      mimeType: foto.mimeType,
      ancho: foto.ancho,
      alto: foto.alto,
      capturadaEn,
      latitud: props.latitud,
      longitud: props.longitud,
    });

    setFotos((prev) => ({ ...prev, [puntoActivo.clave]: guardada }));
    setCapturando(null);
  }

  function actualizar(clave: string, cambios: Partial<EstadoPunto>) {
    setEstados((prev) => ({ ...prev, [clave]: { ...prev[clave], ...cambios } }));
  }

  // ── Qué falta ───────────────────────────────────────────────────────────
  const pendientes = puntos.filter((p) => {
    const e = estados[p.clave];
    if (e.noAplica) return false;
    return !e.calificacion || !fotos[p.clave];
  });

  const listos = puntos.length - pendientes.length;

  return (
    <>
      <PantallaFase
        {...props}
        descripcion={`${puntos.length} puntos. Cada uno necesita foto y calificación.`}
        faltante={
          pendientes.length > 0
            ? `Faltan ${pendientes.length} de ${puntos.length} puntos`
            : null
        }
        recolectar={() => ({
          puntos: Object.fromEntries(
            Object.entries(estados).map(([clave, e]) => [
              clave,
              {
                calificacion: e.calificacion ?? "bueno",
                nota: e.nota,
                noAplica: e.noAplica,
              },
            ])
          ),
        })}
      >
        {/* Contador de avance dentro de la fase. Con 19 puntos, saber cuántos
            van evita la sensación de que la lista no se acaba. */}
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-surface-raised px-4 py-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              pendientes.length === 0
                ? "bg-ok-600 text-white"
                : "bg-brand-600 text-white"
            )}
          >
            {pendientes.length === 0 ? (
              <Check className="size-5" strokeWidth={3} aria-hidden />
            ) : (
              listos
            )}
          </span>
          <p className="text-sm text-ink-secondary">
            {pendientes.length === 0
              ? "Todos los puntos listos"
              : `${listos} de ${puntos.length} completos`}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {puntos.map((punto, i) => {
            const estado = estados[punto.clave];
            const foto = fotos[punto.clave];
            const completo = estado.noAplica || (estado.calificacion && foto);

            return (
              <li key={punto.clave}>
                <Card
                  className={cn(
                    "overflow-hidden",
                    estado.noAplica && "opacity-60"
                  )}
                >
                  <div className="flex gap-3 p-3">
                    {/* Miniatura o botón de captura */}
                    <button
                      type="button"
                      onClick={() => setCapturando(punto.clave)}
                      disabled={estado.noAplica}
                      aria-label={
                        foto
                          ? `Volver a tomar la foto de ${punto.nombre}`
                          : `Tomar foto de ${punto.nombre}`
                      }
                      className={cn(
                        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2",
                        "transition-transform active:scale-95 disabled:active:scale-100",
                        foto
                          ? "border-ok-600"
                          : "border-dashed border-line-strong bg-surface-sunken"
                      )}
                    >
                      {foto && urls[punto.clave] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={urls[punto.clave]}
                            alt={`Evidencia de ${punto.nombre}`}
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-tl-lg bg-ok-600 text-white">
                            <RotateCcw className="size-3.5" aria-hidden />
                          </span>
                        </>
                      ) : (
                        <Camera className="size-7 text-ink-muted" aria-hidden />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 font-semibold leading-snug text-ink">
                          <span className="text-ink-muted">{i + 1}. </span>
                          {punto.nombre}
                        </p>
                        {completo && (
                          <Check
                            className="mt-0.5 size-5 shrink-0 text-ok-600"
                            strokeWidth={3}
                            aria-label="Punto completo"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm leading-snug text-ink-secondary">
                        {punto.pista}
                      </p>

                      {/* Acceso a la guía. Va junto a la pista y no escondido
                          en un menú: es lo que consulta un inspector nuevo, y
                          esconderlo equivale a no tenerlo. */}
                      {guiaDe(punto.clave) && (
                        <button
                          type="button"
                          onClick={() => setGuiaAbierta(punto.clave)}
                          className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-brand-600"
                        >
                          <BookOpen className="size-4 shrink-0" aria-hidden />
                          Ver guía
                        </button>
                      )}

                      {/* Calificación */}
                      {!estado.noAplica && (
                        <div className="mt-2.5 flex gap-1.5">
                          {BOTONES.map((b) => (
                            <button
                              key={b.valor}
                              type="button"
                              onClick={() =>
                                actualizar(punto.clave, { calificacion: b.valor })
                              }
                              aria-pressed={estado.calificacion === b.valor}
                              className={cn(
                                "min-h-10 flex-1 rounded-lg border-2 px-2 text-sm font-semibold transition-colors",
                                estado.calificacion === b.valor
                                  ? b.clases
                                  : "border-line bg-surface text-ink-secondary"
                              )}
                            >
                              {b.etiqueta}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          actualizar(punto.clave, {
                            noAplica: !estado.noAplica,
                            calificacion: null,
                          })
                        }
                        className="mt-2 text-sm font-medium text-ink-muted underline underline-offset-2"
                      >
                        {estado.noAplica ? "Sí aplica" : "No aplica"}
                      </button>

                      {/* Análisis con IA: solo tiene sentido si hay foto y no
                          se marcó como "no aplica". */}
                      {!estado.noAplica && foto && (
                        <AnalisisIA
                          inspeccionId={props.inspeccionId}
                          mediaId={props.evidenciaSubida?.[punto.clave]?.id ?? null}
                          analisisPrevio={
                            (props.evidenciaSubida?.[punto.clave]?.analisis as
                              | Analisis
                              | null) ?? null
                          }
                        />
                      )}
                    </div>
                  </div>

                  {/* La nota solo aparece cuando hay algo que explicar. Un
                      campo de texto por punto en 19 puntos es una pantalla
                      interminable. */}
                  {!estado.noAplica &&
                    (estado.calificacion === "regular" ||
                      estado.calificacion === "malo") && (
                      <div className="border-t border-line p-3">
                        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-secondary">
                          <TriangleAlert
                            className="size-4 text-warn-600"
                            aria-hidden
                          />
                          Describe el hallazgo
                        </label>
                        <Textarea
                          rows={2}
                          value={estado.nota}
                          onChange={(e) =>
                            actualizar(punto.clave, { nota: e.target.value })
                          }
                          placeholder="Qué se observó en este punto"
                        />
                      </div>
                    )}
                </Card>
              </li>
            );
          })}
        </ul>
      </PantallaFase>

      {guiaAbierta && guiaDe(guiaAbierta) && (
        <GuideSheet
          nombre={puntos.find((p) => p.clave === guiaAbierta)?.nombre ?? ""}
          guia={guiaDe(guiaAbierta)!}
          onCerrar={() => setGuiaAbierta(null)}
        />
      )}

      {puntoActivo && (
        <CamaraPantallaCompleta
          puntoNombre={puntoActivo.nombre}
          latitud={props.latitud}
          longitud={props.longitud}
          onCapturar={alCapturar}
          onCerrar={() => setCapturando(null)}
        />
      )}
    </>
  );
}
