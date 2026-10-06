"use client";

import { ArrowLeft, Crown, PenLine, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  estadoColectiva,
  soltarFase,
  tomarFase,
  type EstadoColectiva,
} from "@/app/(flujo)/inspeccion/[id]/colectiva-acciones";
import { ocupadosPorOtros, SEGUNDOS_CONSULTA, SEGUNDOS_LATIDO } from "@/lib/inspection/colectiva";
import { faseIdDeClave } from "@/lib/inspection/flujo";

/** Quien entra a firmas va a cerrar la inspección. */
function esFirmas(clave: string | null): boolean {
  return clave !== null && faseIdDeClave(clave) === "firmas";
}

/**
 * Pregunta cada pocos segundos quién está dónde. Se pausa con la pantalla
 * apagada y pregunta de inmediato al volver.
 */
function useEstadoColectiva(
  inspeccionId: string,
  onCambio?: (estado: NonNullable<EstadoColectiva>) => void
): EstadoColectiva {
  const [estado, setEstado] = useState<EstadoColectiva>(null);
  const avisar = useRef(onCambio);
  useEffect(() => {
    avisar.current = onCambio;
  });

  useEffect(() => {
    let vivo = true;
    async function consultar() {
      if (document.visibilityState !== "visible") return;
      try {
        const nuevo = await estadoColectiva(inspeccionId);
        if (vivo && nuevo) {
          setEstado(nuevo);
          avisar.current?.(nuevo);
        }
      } catch {
        // Sin red: se queda lo último que se supo. La captura sigue.
      }
    }
    void consultar();
    const intervalo = window.setInterval(consultar, SEGUNDOS_CONSULTA * 1000);
    document.addEventListener("visibilitychange", consultar);
    return () => {
      vivo = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", consultar);
    };
  }, [inspeccionId]);

  return estado;
}

/**
 * Aviso grande para los demás cuando alguien entra a firmas: en una
 * colectiva todos firman en ese teléfono.
 */
function AvisoFirmas({ estado, enFirmas }: { estado: EstadoColectiva; enFirmas: boolean }) {
  const quien = estado?.personas.find(
    (p) => esFirmas(p.pasoActual) && p.perfilId !== estado.yoId
  );
  const nombre = quien?.nombre ?? null;

  // Vibra una vez cuando aparece el aviso, no en cada consulta.
  const visto = useRef<string | null>(null);
  useEffect(() => {
    if (nombre && visto.current !== nombre) navigator.vibrate?.([200, 100, 200]);
    visto.current = nombre;
  }, [nombre]);

  if (!nombre || enFirmas) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 border-b border-brand-700 bg-brand-600 px-gutter pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <PenLine className="mt-0.5 size-6 shrink-0" aria-hidden />
        <p>
          <strong className="block text-base">
            {nombre}, el encargado, está cerrando la inspección.
          </strong>
          <span className="text-sm text-white/90">
            Ve a su teléfono a firmar. Todos los que participaron firman ahí.
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * Envuelve una fase de una inspección colectiva.
 *
 * Ocupa la fase mientras la persona está en ella y renueva el latido. Si otra
 * persona ya la tiene, tapa la pantalla: dos personas capturando la misma
 * fase se pisarían, y el expediente quedaría con lo último que se guardó.
 *
 * Sin red no bloquea: la captura es offline primero, y el servidor vuelve a
 * revisar al guardar.
 */
export function GuardiaColectiva({
  inspeccionId,
  clavePaso,
  children,
}: {
  inspeccionId: string;
  clavePaso: string;
  children: ReactNode;
}) {
  const [ocupante, setOcupante] = useState<string | null>(null);
  const estado = useEstadoColectiva(inspeccionId);

  useEffect(() => {
    let vivo = true;
    async function latido() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await tomarFase(inspeccionId, clavePaso);
        if (!vivo || !r.ok) return;
        setOcupante(r.ocupada ? r.nombre : null);
      } catch {
        // Sin red: no se bloquea a nadie.
      }
    }
    void latido();
    const intervalo = window.setInterval(latido, SEGUNDOS_LATIDO * 1000);
    document.addEventListener("visibilitychange", latido);
    return () => {
      vivo = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", latido);
      // Al salir se libera; si la app se cierra de golpe, la base la libera
      // sola a los 2 minutos.
      void soltarFase(inspeccionId, clavePaso).catch(() => {});
    };
  }, [inspeccionId, clavePaso]);

  // Mientras está ocupada se reintenta más seguido, para entrar en cuanto se
  // libere.
  useEffect(() => {
    if (!ocupante) return;
    const intervalo = window.setInterval(async () => {
      try {
        const r = await tomarFase(inspeccionId, clavePaso);
        if (r.ok) setOcupante(r.ocupada ? r.nombre : null);
      } catch {}
    }, SEGUNDOS_CONSULTA * 1000);
    return () => window.clearInterval(intervalo);
  }, [ocupante, inspeccionId, clavePaso]);

  return (
    <>
      <AvisoFirmas estado={estado} enFirmas={esFirmas(clavePaso)} />
      {children}
      {ocupante && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fase-ocupada"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-surface/95 p-gutter backdrop-blur"
        >
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
              <Users className="size-8 text-brand-600" aria-hidden />
            </span>
            <h2 id="fase-ocupada" className="text-lg font-bold text-ink">
              {ocupante} está capturando esta fase
            </h2>
            <p className="text-sm text-ink-secondary">
              Solo una persona puede estar en cada fase, para que nadie capture encima
              de otro. Se libera cuando {ocupante} salga o, si cerró la app, en unos 2
              minutos. Esta pantalla se abre sola en cuanto quede libre.
            </p>
            <Link
              href={`/inspeccion/${inspeccionId}`}
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white"
            >
              <ArrowLeft className="size-5" aria-hidden />
              Volver a la inspección
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Presencia en el índice de una inspección colectiva: quién está en qué fase
 * y el aviso de firmas. Refresca el índice para que las fases ocupadas y las
 * terminadas por otros se vean sin recargar.
 */
export function PresenciaColectiva({
  inspeccionId,
  titulos,
}: {
  inspeccionId: string;
  titulos: Record<string, string>;
}) {
  const router = useRouter();
  // Se refresca el índice solo cuando alguien cambió de fase o terminó una,
  // no en cada consulta.
  const huella = useRef<string | null>(null);
  const estado = useEstadoColectiva(inspeccionId, (nuevo) => {
    const actual = JSON.stringify(nuevo.personas.map((p) => [p.perfilId, p.fases, p.pasoActual]));
    if (huella.current !== null && huella.current !== actual) router.refresh();
    huella.current = actual;
  });
  const otros = estado ? ocupadosPorOtros(estado.personas, estado.yoId) : [];

  return (
    <>
      <AvisoFirmas estado={estado} enFirmas={false} />
      <div className="mx-auto max-w-3xl px-gutter pt-4">
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-800 dark:bg-brand-950">
          <Users className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0 text-ink-secondary">
            <p className="font-semibold text-ink">Inspección colectiva</p>
            {otros.length === 0 ? (
              <p>Nadie más está capturando ahora. Queda registrado quién hace cada fase.</p>
            ) : (
              <ul>
                {otros.map((p) => (
                  <li key={p.perfilId}>
                    <strong className="text-ink">{p.nombre}</strong> está en{" "}
                    {titulos[p.pasoActual ?? ""] ?? "una fase"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Lo que ve en Firmas quien no es el encargado de una colectiva.
 *
 * La firma final se hace en un solo teléfono, el del encargado, para que no
 * cualquiera pueda dar por terminada una inspección en la que trabajaron
 * varios. Aquí no se captura nada.
 */
export function FirmasSoloEncargado({
  inspeccionId,
  encargado,
}: {
  inspeccionId: string;
  encargado: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-gutter text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
        <Crown className="size-8 text-brand-600" aria-hidden />
      </span>
      <h1 className="text-lg font-bold text-ink">
        La firma final se hace en el teléfono de {encargado}
      </h1>
      <p className="text-sm text-ink-secondary">
        {encargado} es el encargado de esta inspección y es quien la cierra. Cuando
        entre a Firmas te va a aparecer un aviso: ve a su teléfono a firmar.
      </p>
      <p className="text-sm text-ink-muted">
        Si el encargado no puede cerrarla, un administrador puede cambiarlo desde
        el panel.
      </p>
      <Link
        href={`/inspeccion/${inspeccionId}`}
        className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white"
      >
        <ArrowLeft className="size-5" aria-hidden />
        Volver a la inspección
      </Link>
    </main>
  );
}
