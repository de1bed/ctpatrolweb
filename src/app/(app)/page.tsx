import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, Lock, Plus, Truck } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/shell/app-header";
import { StatusBadge } from "@/components/inspection/status-badge";
import { Card } from "@/components/ui/card";
import { obtenerPermisos, requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const sesion = await requerirSesion();
  const permisos = await obtenerPermisos(sesion);
  const supabase = await createClient();

  // RLS ya limita esto a lo que el usuario puede ver, así que no hace falta
  // filtrar por inspector aquí: un inspector solo recibe las suyas, un admin
  // recibe las de su cuenta.
  const { data: activas } = await supabase
    .from("inspections")
    .select(
      "id, display_id, status, customer_name, tractor_number, transport_type, updated_at"
    )
    .in("status", ["assigned", "in_progress", "paused"])
    .order("updated_at", { ascending: false })
    .limit(20);

  const pendientes = activas ?? [];
  const primerNombre = sesion.nombre.split(/\s+/)[0];

  return (
    <>
      <AppHeader
        titulo={`Hola, ${primerNombre}`}
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      {/* pb-24 reserva el alto de la barra de pestañas; en lg ya no existe. */}
      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
        {/* ── Acción principal ────────────────────────────────────────────
            Ocupa el ancho completo y va arriba de todo: en el 90% de las
            veces que se abre la app es para esto.                        */}
        {permisos.puedeIniciarInspeccion ? (
          <Link
            href="/inspeccion/nueva"
            className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-600 px-6 text-lg font-semibold text-white shadow-sm transition-transform active:scale-[0.98] hover:bg-brand-700"
          >
            <Plus className="size-6 shrink-0" aria-hidden />
            Nueva inspección
          </Link>
        ) : (
          <Card className="flex items-start gap-3 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                Solo trabajas inspecciones asignadas
              </p>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Tu administrador no habilitó el arranque de inspecciones por tu
                cuenta. Las que te asignen aparecen aquí abajo.
              </p>
            </div>
          </Card>
        )}

        {/* ── Pendientes ──────────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Pendientes
            </h2>
            {pendientes.length > 0 && (
              <span className="text-sm font-medium text-ink-muted">
                {pendientes.length}
              </span>
            )}
          </div>

          {pendientes.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Truck className="size-10 text-ink-muted/50" aria-hidden />
              <p className="font-medium text-ink">Nada pendiente</p>
              <p className="max-w-xs text-sm text-ink-secondary">
                Cuando tengas inspecciones asignadas o a medias, aparecen aquí.
              </p>
            </Card>
          ) : (
            // Una columna en teléfono, dos de iPad en adelante. En pantalla
            // grande una sola columna de tarjetas anchas se lee peor, no mejor.
            <ul className="grid gap-3 sm:grid-cols-2">
              {pendientes.map((insp) => (
                <li key={insp.id}>
                  <Link href={`/inspeccion/${insp.id}`} className="block">
                    <Card
                      interactive
                      className="flex items-center gap-3 p-4 hover:border-line-strong"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge estado={insp.status} />
                        </div>
                        <p className="mt-2 truncate text-base font-semibold text-ink">
                          {insp.customer_name ?? "Sin transportista"}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-secondary">
                          <span className="font-mono">{insp.display_id}</span>
                          {insp.tractor_number && ` · ${insp.tractor_number}`}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {formatDistanceToNow(new Date(insp.updated_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      <ChevronRight
                        className="size-5 shrink-0 text-ink-muted"
                        aria-hidden
                      />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
