"use client";

import { Check, LoaderCircle, MapPin, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PantallaFase } from "@/components/inspection/phase-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

import { previo, type PropsFase } from "./tipos";

type EstadoGps =
  | { tipo: "inicial" }
  | { tipo: "buscando" }
  | { tipo: "listo"; lat: number; lng: number; precision: number }
  | { tipo: "error"; mensaje: string };

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
        // Mensajes distintos por causa: "permiso denegado" se arregla en los
        // ajustes del navegador, "sin señal" con salir del edificio. Decir
        // solo "error de ubicación" deja al inspector sin saber qué hacer.
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
        // Alta precisión: la coordenada es evidencia de dónde se hizo la
        // inspección, no una sugerencia de restaurantes cercanos.
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  });
}

/** Fecha de hoy en formato yyyy-mm-dd, en la zona horaria del dispositivo. */
function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function ahoraLocal(): string {
  const d = new Date();
  // datetime-local necesita la hora LOCAL sin zona. toISOString daría UTC y
  // en México se vería seis horas corrida.
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/**
 * Fase 1 · Configuración inicial.
 *
 * Fecha, hora de entrada de la unidad y coordenadas del punto de inspección.
 * El GPS se pide en cuanto abre la pantalla: tarda unos segundos en fijar
 * posición, y arrancarlo mientras el inspector llena la hora aprovecha ese
 * tiempo en lugar de hacerlo esperar al final.
 */
export function FaseConfiguracion(props: PropsFase) {
  const [fecha, setFecha] = useState(() =>
    previo(props.datosPrevios, "fecha", hoyLocal())
  );
  const [horaEntrada, setHoraEntrada] = useState(() =>
    previo(props.datosPrevios, "horaEntrada", ahoraLocal())
  );

  // Arranca en "buscando" cuando no hay coordenada previa, para que el efecto
  // de montaje solo tenga que lanzar la petición al GPS. Si el estado inicial
  // fuera "inicial", el efecto tendría que llamar a setState de forma síncrona
  // y eso provoca un render en cascada.
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
    return { tipo: "buscando" };
  });

  // Arranca la búsqueda cuando el estado lo pide. El efecto no toca setGps de
  // forma síncrona: solo lanza la promesa y responde en su callback, que ya es
  // asíncrono. Esa es la diferencia entre sincronizar con un sistema externo
  // (correcto) y provocar renders en cascada.
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

  /** Reintento manual desde el botón. */
  function pedirUbicacion() {
    setGps({ tipo: "buscando" });
  }

  return (
    <PantallaFase
      {...props}
      descripcion="Cuándo llegó la unidad y dónde se está inspeccionando."
      faltante={!fecha || !horaEntrada ? "Completa la fecha y la hora" : null}
      recolectar={() => ({
        fecha,
        horaEntrada,
        latitud: gps.tipo === "listo" ? gps.lat : null,
        longitud: gps.tipo === "listo" ? gps.lng : null,
        precision: gps.tipo === "listo" ? gps.precision : null,
      })}
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

        {/* ── Ubicación ────────────────────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Ubicación</p>

              {gps.tipo === "buscando" && (
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-secondary">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Buscando señal…
                </p>
              )}

              {gps.tipo === "listo" && (
                <>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ok-700 dark:text-ok-500">
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
                <p className="mt-1 flex items-start gap-1.5 text-sm text-warn-700 dark:text-warn-500">
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
            </div>
          </div>

          {/* La inspección puede seguir sin GPS: en un sótano o un patio
              techado no hay señal, y bloquear ahí dejaría al inspector
              atorado sin poder trabajar. Se avisa y se registra la ausencia. */}
          {gps.tipo === "error" && (
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
