"use client";

import { Check, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { registrarEvidencia } from "@/app/(flujo)/inspeccion/[id]/media-acciones";
import { cn } from "@/lib/cn";
import {
  actualizarEstado,
  liberarSubidas,
  pendientesDeSubida,
  type FotoLocal,
} from "@/lib/media/almacen";
import { createClient } from "@/lib/supabase/client";

/** Tope de reintentos antes de dejar de insistir sola. */
const MAX_INTENTOS = 5;

type Estado =
  | { tipo: "inactivo" }
  | { tipo: "subiendo"; hechas: number; total: number }
  | { tipo: "sinRed"; pendientes: number }
  | { tipo: "atorado"; pendientes: number };

/**
 * Sincronizador de evidencia.
 *
 * Vive montado durante todo el flujo y drena la cola de IndexedDB en segundo
 * plano. El inspector nunca espera a que suba una foto: sigue capturando y
 * esto trabaja detrás.
 *
 * Reintenta al recuperar la red y al volver a la pestaña. No reintenta en un
 * bucle cerrado: con cinco fallos deja de insistir y lo dice, porque seguir
 * intentando contra un error real solo gasta batería y datos.
 */
export function Uploader({ companyAccountId }: { companyAccountId: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });
  const [enMarcha, setEnMarcha] = useState(false);

  const drenar = useCallback(async () => {
    if (enMarcha) return;
    setEnMarcha(true);

    try {
      const cola = await pendientesDeSubida();

      if (cola.length === 0) {
        setEstado({ tipo: "inactivo" });
        return;
      }

      if (!navigator.onLine) {
        setEstado({ tipo: "sinRed", pendientes: cola.length });
        return;
      }

      const porIntentar = cola.filter((f) => f.intentos < MAX_INTENTOS);
      if (porIntentar.length === 0) {
        setEstado({ tipo: "atorado", pendientes: cola.length });
        return;
      }

      const supabase = createClient();
      let hechas = 0;

      for (const foto of porIntentar) {
        setEstado({ tipo: "subiendo", hechas, total: porIntentar.length });

        const ok = await subirUna(supabase, foto, companyAccountId);
        if (ok) hechas++;

        // Si se cayó la red a media cola, no tiene caso seguir golpeando.
        if (!navigator.onLine) break;
      }

      const restantes = await pendientesDeSubida();
      if (restantes.length === 0) {
        setEstado({ tipo: "inactivo" });
        // Liberar el espacio de lo confirmado. Una inspección completa puede
        // pasar de 100 MB y la cuota del navegador no es infinita.
        await liberarSubidas(porIntentar[0].inspeccionId);
      } else {
        setEstado({
          tipo: restantes.every((f) => f.intentos >= MAX_INTENTOS)
            ? "atorado"
            : "sinRed",
          pendientes: restantes.length,
        });
      }
    } finally {
      setEnMarcha(false);
    }
  }, [enMarcha, companyAccountId]);

  useEffect(() => {
    // Un primer barrido al montar recoge lo que quedó de una sesión anterior
    // que se cerró a media subida.
    const inicial = setTimeout(drenar, 1200);

    // Al recuperar la red y al volver a la pestaña: son los dos momentos en
    // que algo pudo cambiar sin que la app estuviera mirando.
    const alVolverRed = () => drenar();
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") drenar();
    };

    window.addEventListener("online", alVolverRed);
    document.addEventListener("visibilitychange", alVolverVisible);

    // Latido de respaldo por si algo se quedó pendiente sin ningún evento.
    const latido = setInterval(drenar, 45_000);

    return () => {
      clearTimeout(inicial);
      clearInterval(latido);
      window.removeEventListener("online", alVolverRed);
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, [drenar]);

  if (estado.tipo === "inactivo") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2",
        "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-lg",
        "backdrop-blur-xl",
        estado.tipo === "subiendo" && "border-line bg-surface/90 text-ink",
        estado.tipo === "sinRed" && "border-warn-500/40 bg-warn-50 text-warn-700",
        estado.tipo === "atorado" && "border-danger-500/40 bg-danger-50 text-danger-700"
      )}
    >
      {estado.tipo === "subiendo" && (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Subiendo evidencia {estado.hechas + 1} de {estado.total}
        </>
      )}

      {estado.tipo === "sinRed" && (
        <>
          <CloudOff className="size-4" aria-hidden />
          {estado.pendientes} sin subir · se enviarán solas
        </>
      )}

      {estado.tipo === "atorado" && (
        <>
          <RefreshCw className="size-4" aria-hidden />
          {estado.pendientes} sin subir
          <button
            type="button"
            onClick={async () => {
              // Reintento manual: se reinicia el contador de intentos.
              const cola = await pendientesDeSubida();
              await Promise.all(
                cola.map((f) => actualizarEstado(f.clientId, { intentos: 0 }))
              );
              drenar();
            }}
            className="ml-1 underline underline-offset-2"
          >
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Sube una foto y registra su fila.
 *
 * El orden importa: primero el archivo, después la fila. Al revés quedaría
 * una fila apuntando a un archivo que quizá nunca llegó, y el reporte saldría
 * con un hueco donde debería ir la evidencia.
 */
async function subirUna(
  supabase: ReturnType<typeof createClient>,
  foto: FotoLocal,
  companyAccountId: string
): Promise<boolean> {
  const ruta = `${companyAccountId}/${foto.inspeccionId}/${foto.paso}/${foto.clientId}.jpg`;

  try {
    await actualizarEstado(foto.clientId, { estado: "subiendo" });

    const { error: errorSubida } = await supabase.storage
      .from("inspection-media")
      .upload(ruta, foto.blob, {
        contentType: foto.mimeType,
        // upsert: un reintento sobre una subida que sí llegó no debe fallar
        // por "el archivo ya existe".
        upsert: true,
      });

    if (errorSubida) throw new Error(errorSubida.message);

    const registro = await registrarEvidencia({
      inspeccionId: foto.inspeccionId,
      clientId: foto.clientId,
      paso: foto.paso,
      puntoClave: foto.puntoClave,
      puntoNombre: foto.puntoNombre,
      storagePath: ruta,
      mimeType: foto.mimeType,
      tamanoBytes: foto.blob.size,
      ancho: foto.ancho,
      alto: foto.alto,
      capturadaEn: foto.capturadaEn,
      latitud: foto.latitud,
      longitud: foto.longitud,
    });

    if (!registro.ok) throw new Error(registro.error);

    await actualizarEstado(foto.clientId, {
      estado: "subida",
      storagePath: ruta,
      ultimoError: null,
    });
    return true;
  } catch (e) {
    await actualizarEstado(foto.clientId, {
      estado: "fallida",
      intentos: foto.intentos + 1,
      ultimoError: e instanceof Error ? e.message : "Error desconocido",
    });
    return false;
  }
}

export { Check as IconoListo };
