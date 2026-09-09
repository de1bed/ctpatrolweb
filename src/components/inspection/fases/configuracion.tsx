"use client";

import { Check, LoaderCircle, MapPin, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { OptionCards } from "@/components/ui/option-cards";

import { previo, type PropsFase } from "./tipos";

type EstadoGps =
  | { tipo: "inicial" }
  | { tipo: "buscando" }
  | { tipo: "listo"; lat: number; lng: number; precision: number }
  | { tipo: "error"; mensaje: string };

type ModoUbicacion = "dispositivo" | "manual";

/**
 * Pide la posición y devuelve siempre un estado, nunca lanza.
 *
 * Envolver la API de callbacks en una promesa que resuelve tanto el éxito
 * como el error deja un solo camino de salida. Así quien la llama no tiene
 * que manejar dos ramas ni preocuparse por el caso "el navegador no la
 * soporta", que aquí ya viene resuelto como un estado de error normal.
 */
function obtenerPosicion(): Promise<EstadoGps> {
  return new Promise((resolver) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolver({
        tipo: "error",
        mensaje: "Este dispositivo no puede dar la ubicación.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolver({
          tipo: "listo",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
        }),
      (err) => {
        const mensajes: Record<number, string> = {
          1: "Permiso denegado. Habilita la ubicación para este sitio en los ajustes del navegador.",
          2: "No se pudo obtener la señal. Intenta a cielo abierto.",
          3: "La búsqueda tardó demasiado. Intenta de nuevo.",
        };
        resolver({
          tipo: "error",
          mensaje: mensajes[err.code] ?? "No se pudo obtener la ubicación.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  });
}

function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function ahoraLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function parsearCoordenada(valor: string, min: number, max: number): number | null {
  const n = Number(valor.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Fase 1 · Configuración inicial.
 *
 * Fecha, hora de entrada y ubicación. El GPS sigue siendo el camino por
 * defecto; la captura manual cubre sótanos, fallos de señal o un punto
 * distinto al del dispositivo.
 */
export function FaseConfiguracion(props: PropsFase) {
  const [fecha, setFecha] = useState(() =>
    previo(props.datosPrevios, "fecha", hoyLocal())
  );
  const [horaEntrada, setHoraEntrada] = useState(() =>
    previo(props.datosPrevios, "horaEntrada", ahoraLocal())
  );

  const [modoUbicacion, setModoUbicacion] = useState<ModoUbicacion>(() =>
    previo<ModoUbicacion>(props.datosPrevios, "origenUbicacion", "dispositivo")
  );
  const [latManual, setLatManual] = useState(() => {
    const lat = previo<number | null>(props.datosPrevios, "latitud", null);
    return lat != null ? String(lat) : "";
  });
  const [lngManual, setLngManual] = useState(() => {
    const lng = previo<number | null>(props.datosPrevios, "longitud", null);
    return lng != null ? String(lng) : "";
  });

  const [gps, setGps] = useState<EstadoGps>(() => {
    const lat = previo<number | null>(props.datosPrevios, "latitud", null);
    const lng = previo<number | null>(props.datosPrevios, "longitud", null);
    if (lat != null && lng != null) {
      return {
        tipo: "listo",
        lat,
        lng,
        precision: previo(props.datosPrevios, "precision", 0),
      };
    }
    return previo<ModoUbicacion>(props.datosPrevios, "origenUbicacion", "dispositivo") === "manual"
      ? { tipo: "inicial" }
      : { tipo: "buscando" };
  });

  useEffect(() => {
    if (gps.tipo !== "buscando") return;

    let vivo = true;
    obtenerPosicion().then((resultado) => {
      if (vivo) setGps(resultado);
    });

    return () => {
      vivo = false;
    };
  }, [gps.tipo]);

  function pedirUbicacion() {
    setGps({ tipo: "buscando" });
  }

  function cambiarModo(modo: ModoUbicacion) {
    setModoUbicacion(modo);
    if (modo === "dispositivo" && gps.tipo !== "listo") {
      setGps({ tipo: "buscando" });
    }
  }

  const latManualN = parsearCoordenada(latManual, -90, 90);
  const lngManualN = parsearCoordenada(lngManual, -180, 180);
  const manualIncompleto =
    modoUbicacion === "manual" &&
    (latManual.trim().length > 0 || lngManual.trim().length > 0) &&
    (latManualN == null || lngManualN == null);

  return (
    <PantallaFase
      {...props}
      descripcion="Cuándo llegó la unidad y dónde se está inspeccionando."
      faltante={
        !fecha || !horaEntrada
          ? "Completa la fecha y la hora"
          : manualIncompleto
            ? "Revisa latitud y longitud, o déjalas en blanco"
            : null
      }
      recolectar={() => {
        if (modoUbicacion === "manual") {
          return {
            fecha,
            horaEntrada,
            latitud: latManualN,
            longitud: lngManualN,
            precision: null,
            origenUbicacion: "manual" as const,
          };
        }
        return {
          fecha,
          horaEntrada,
          latitud: gps.tipo === "listo" ? gps.lat : null,
          longitud: gps.tipo === "listo" ? gps.lng : null,
          precision: gps.tipo === "listo" ? gps.precision : null,
          origenUbicacion: "dispositivo" as const,
        };
      }}
    >
      <div className="flex flex-col gap-5">
        <Field label="Fecha" required>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          )}
        </Field>

        <Field
          label="Hora de entrada"
          required
          hint="Cuándo llegó la unidad al patio"
        >
          {(p) => (
            <Input
              {...p}
              type="datetime-local"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
            />
          )}
        </Field>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Ubicación</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Usa el GPS del dispositivo o captura las coordenadas a mano si
                no hay señal o debe registrarse otro punto.
              </p>

              <div className="mt-3">
                <OptionCards
                  nombre="origen-ubicacion"
                  opciones={[
                    {
                      valor: "dispositivo",
                      etiqueta: "Ubicación actual",
                      descripcion: "GPS del dispositivo",
                    },
                    {
                      valor: "manual",
                      etiqueta: "Captura manual",
                      descripcion: "Latitud y longitud",
                    },
                  ]}
                  valor={modoUbicacion}
                  onChange={cambiarModo}
                  columnas={2}
                />
              </div>

              {modoUbicacion === "dispositivo" && (
                <>
                  {gps.tipo === "buscando" && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      Buscando señal…
                    </p>
                  )}

                  {gps.tipo === "listo" && (
                    <>
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ok-700 dark:text-ok-500">
                        <Check className="size-4" aria-hidden />
                        Capturada
                      </p>
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                        {gps.precision > 0 && ` · ±${Math.round(gps.precision)} m`}
                      </p>
                    </>
                  )}

                  {gps.tipo === "error" && (
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-warn-700 dark:text-warn-500">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {gps.mensaje}
                    </p>
                  )}

                  {gps.tipo !== "buscando" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={pedirUbicacion}
                      className="mt-3"
                    >
                      {gps.tipo === "listo" ? "Actualizar" : "Reintentar"}
                    </Button>
                  )}
                </>
              )}

              {modoUbicacion === "manual" && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Latitud"
                    ayuda="Coordenada norte-sur. En México suele estar entre 14 y 33. Puedes copiarla de un mapa."
                  >
                    {(p) => (
                      <Input
                        {...p}
                        value={latManual}
                        onChange={(e) => setLatManual(e.target.value)}
                        inputMode="decimal"
                        placeholder="Ej. 32.525000"
                      />
                    )}
                  </Field>
                  <Field
                    label="Longitud"
                    ayuda="Coordenada este-oeste. En México es negativa, por ejemplo -117.02."
                  >
                    {(p) => (
                      <Input
                        {...p}
                        value={lngManual}
                        onChange={(e) => setLngManual(e.target.value)}
                        inputMode="decimal"
                        placeholder="Ej. -117.020000"
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
          </div>

          {((modoUbicacion === "dispositivo" && gps.tipo === "error") ||
            (modoUbicacion === "manual" && !latManual.trim() && !lngManual.trim())) && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
              Puedes continuar sin ubicación. Quedará registrado que no se
              capturó.
            </p>
          )}
        </Card>
      </div>
    </PantallaFase>
  );
}
