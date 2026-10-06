import { Crown, Play, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { HoraLocal } from "@/components/ui/hora-local";
import { cn } from "@/lib/cn";
import type { Equipo } from "@/lib/inspecciones/colectiva";

/**
 * "EN VIVO": alguien está capturando ahora mismo. Rojo y pulsando, para que
 * en una lista de inspecciones se distinga de un vistazo cuál se está
 * trabajando en este momento.
 */
export function PastillaEnVivo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-danger-500/50 bg-danger-50 px-2.5 py-1 text-xs font-bold uppercase leading-none tracking-wide text-danger-700 dark:bg-danger-500/10 dark:text-danger-500",
        className
      )}
    >
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-danger-600" />
      </span>
      En vivo
    </span>
  );
}

/** Punto verde junto a quien está dentro de una fase ahora. */
function PuntoPresente() {
  return (
    <span className="relative ml-1 inline-flex size-2" aria-label="capturando ahora">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok-500 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-ok-600" />
    </span>
  );
}

/**
 * Equipo de una inspección colectiva: el encargado, quién la empezó y
 * quiénes se unieron, con quién está capturando en este momento.
 */
export function EquipoInspeccion({
  equipo,
  titulos,
  yoId,
  abierta,
}: {
  equipo: Equipo;
  /** Clave de paso → título, para decir en qué fase está cada quien. */
  titulos: Record<string, string>;
  yoId: string;
  abierta: boolean;
}) {
  const presente = (id: string) =>
    abierta && equipo.personas.some((p) => p.perfilId === id && p.pasoActual);
  const fase = (id: string) => {
    const paso = equipo.personas.find((p) => p.perfilId === id)?.pasoActual;
    return abierta && paso ? (titulos[paso] ?? "una fase") : null;
  };
  const yo = (id: string) => (id === yoId ? " (tú)" : "");

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <Users className="size-5 text-brand-600" aria-hidden />
          Equipo
        </p>
        {abierta && equipo.enVivo && <PastillaEnVivo />}
      </div>

      <dl className="mt-3 flex flex-col gap-3 text-sm">
        <div className="flex items-start gap-2.5">
          <Crown className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0">
            <dt className="text-ink-muted">Encargado · cierra y recoge las firmas</dt>
            <dd className="font-semibold text-ink">
              {equipo.encargado ? (
                <>
                  {equipo.encargado.nombre}
                  {yo(equipo.encargado.id)}
                  {presente(equipo.encargado.id) && <PuntoPresente />}
                  {fase(equipo.encargado.id) && (
                    <span className="font-normal text-ink-secondary">
                      {" "}
                      · en {fase(equipo.encargado.id)}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-normal text-ink-secondary">
                  Sin asignar: lo será quien la empiece
                </span>
              )}
            </dd>
          </div>
        </div>

        {equipo.inicio && (
          <div className="flex items-start gap-2.5">
            <Play className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
            <div>
              <dt className="text-ink-muted">La inició</dt>
              <dd className="font-medium text-ink">
                {equipo.inicio.nombre}
                {yo(equipo.inicio.id)}
                <span className="font-normal text-ink-secondary">
                  {" "}
                  · <HoraLocal iso={equipo.inicio.en} />
                </span>
              </dd>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <dt className="text-ink-muted">
              Se unieron{equipo.unidos.length > 0 ? ` · ${equipo.unidos.length}` : ""}
            </dt>
            <dd>
              {equipo.unidos.length === 0 ? (
                <span className="text-ink-secondary">Nadie más todavía</span>
              ) : (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {equipo.unidos.map((p) => (
                    <li key={p.perfilId} className="text-ink">
                      <span className="font-medium">
                        {p.nombre}
                        {yo(p.perfilId)}
                      </span>
                      {presente(p.perfilId) && <PuntoPresente />}
                      <span className="text-ink-secondary">
                        {fase(p.perfilId)
                          ? ` · en ${fase(p.perfilId)}`
                          : ` · ${p.fases} ${p.fases === 1 ? "fase" : "fases"}, ${p.fotos} ${p.fotos === 1 ? "foto" : "fotos"}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </div>
      </dl>
    </Card>
  );
}
