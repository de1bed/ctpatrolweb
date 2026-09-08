"use client";

import { AlertCircle, ChevronDown, Save, ShieldCheck, UserX } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Tables } from "@/lib/supabase/database.types";

import { cambiarActivo, guardarPermisos } from "./acciones";

export type InspectorConPermisos = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "email" | "role" | "is_active" | "created_at"
> & {
  inspector_permissions: Tables<"inspector_permissions"> | null;
};

type ModoAlmacen = "persist" | "ephemeral";

type EstadoPermisos = {
  can_start_new_inspection: boolean;
  can_create_customer: boolean;
  customer_storage_mode: ModoAlmacen;
  can_create_driver: boolean;
  driver_storage_mode: ModoAlmacen;
  can_create_tractor: boolean;
  tractor_storage_mode: ModoAlmacen;
  can_create_container: boolean;
  container_storage_mode: ModoAlmacen;
  can_edit_documents: boolean;
  can_edit_movement_data: boolean;
};

const CATALOGOS = [
  { clave: "customer", etiqueta: "Transportistas" },
  { clave: "driver", etiqueta: "Conductores" },
  { clave: "tractor", etiqueta: "Tractores" },
  { clave: "container", etiqueta: "Contenedores" },
] as const;

/**
 * Ficha de un usuario con sus permisos de campo.
 *
 * Se despliega en el mismo lugar en vez de abrir otra pantalla: el admin
 * normalmente ajusta permisos de varios inspectores seguidos, y navegar ida
 * y vuelta por cada uno lo vuelve tedioso.
 */
export function TarjetaInspector({
  usuario,
  esYo,
}: {
  usuario: InspectorConPermisos;
  esYo: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const [pendiente, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const p = usuario.inspector_permissions;
  const [permisos, setPermisos] = useState<EstadoPermisos>({
    can_start_new_inspection: p?.can_start_new_inspection ?? false,
    can_create_customer: p?.can_create_customer ?? false,
    customer_storage_mode: (p?.customer_storage_mode ?? "ephemeral") as ModoAlmacen,
    can_create_driver: p?.can_create_driver ?? false,
    driver_storage_mode: (p?.driver_storage_mode ?? "ephemeral") as ModoAlmacen,
    can_create_tractor: p?.can_create_tractor ?? false,
    tractor_storage_mode: (p?.tractor_storage_mode ?? "ephemeral") as ModoAlmacen,
    can_create_container: p?.can_create_container ?? false,
    container_storage_mode: (p?.container_storage_mode ?? "ephemeral") as ModoAlmacen,
    can_edit_documents: p?.can_edit_documents ?? false,
    can_edit_movement_data: p?.can_edit_movement_data ?? false,
  });

  const esInspector = usuario.role === "inspector";

  function alternar(campo: keyof EstadoPermisos, valor: boolean | ModoAlmacen) {
    setPermisos((prev) => ({ ...prev, [campo]: valor }));
    setMensaje(null);
  }

  return (
    <Card className={cn("overflow-hidden", !usuario.is_active && "opacity-60")}>
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            usuario.role === "inspector"
              ? "bg-brand-600 text-white"
              : "bg-ok-600 text-white"
          )}
        >
          {usuario.full_name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((x) => x[0]?.toUpperCase() ?? "")
            .join("") || "?"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">
            {usuario.full_name || usuario.email}
            {esYo && (
              <span className="ml-2 text-xs font-normal text-ink-muted">(tú)</span>
            )}
          </p>
          <p className="truncate text-sm text-ink-secondary">{usuario.email}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-secondary">
              {usuario.role === "inspector" ? "Inspector" : "Administrador"}
            </span>
            {!usuario.is_active && (
              <span className="rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                Desactivado
              </span>
            )}
          </p>
        </div>

        {esInspector && (
          <button
            type="button"
            onClick={() => setAbierta((a) => !a)}
            aria-expanded={abierta}
            aria-label={abierta ? "Ocultar permisos" : "Ver permisos"}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
          >
            <ChevronDown
              className={cn("size-5 transition-transform", abierta && "rotate-180")}
              aria-hidden
            />
          </button>
        )}
      </div>

      {/* ── Permisos ─────────────────────────────────────────────────── */}
      {esInspector && abierta && (
        <div className="border-t border-line p-4">
          {error && (
            <p
              role="alert"
              className="mb-3 flex items-start gap-2 text-sm text-danger-600"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Fila
            etiqueta="Iniciar inspecciones por su cuenta"
            ayuda="Si está apagado, solo trabaja las que le asignes."
            activo={permisos.can_start_new_inspection}
            onChange={(v) => alternar("can_start_new_inspection", v)}
          />

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-1 font-semibold text-ink">Alta de catálogo en campo</p>
            <p className="mb-3 text-sm text-ink-secondary">
              Si permites el alta, elige si lo que registre se queda en el
              catálogo o vive solo para esa inspección. Lo segundo evita que un
              typo en el patio ensucie el catálogo para siempre.
            </p>

            {CATALOGOS.map((c) => {
              const puede = permisos[`can_create_${c.clave}`] as boolean;
              const modo = permisos[`${c.clave}_storage_mode`] as ModoAlmacen;

              return (
                <div key={c.clave} className="mb-3 last:mb-0">
                  <Fila
                    etiqueta={c.etiqueta}
                    activo={puede}
                    onChange={(v) => alternar(`can_create_${c.clave}`, v)}
                  />
                  {puede && (
                    <div className="ml-1 mt-2 flex gap-2">
                      {(
                        [
                          { v: "persist", t: "Se queda en el catálogo" },
                          { v: "ephemeral", t: "Solo esa inspección" },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => alternar(`${c.clave}_storage_mode`, o.v)}
                          aria-pressed={modo === o.v}
                          className={cn(
                            "min-h-9 flex-1 rounded-lg border px-2 text-xs font-medium transition-colors",
                            modo === o.v
                              ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                              : "border-line text-ink-secondary"
                          )}
                        >
                          {o.t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <Fila
              etiqueta="Editar documentos"
              ayuda="Factura, BL, pedimento. Apágalo si los precargas tú."
              activo={permisos.can_edit_documents}
              onChange={(v) => alternar("can_edit_documents", v)}
            />
            <Fila
              etiqueta="Editar datos de movimiento"
              activo={permisos.can_edit_movement_data}
              onChange={(v) => alternar("can_edit_movement_data", v)}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              loading={pendiente}
              onClick={() =>
                empezar(async () => {
                  setError(null);
                  setMensaje(null);
                  const r = await guardarPermisos({ profileId: usuario.id, ...permisos });
                  if (r.ok) setMensaje("Permisos guardados");
                  else setError(r.error);
                })
              }
            >
              <Save className="size-4" aria-hidden />
              Guardar permisos
            </Button>

            {mensaje && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-ok-700 dark:text-ok-500">
                <ShieldCheck className="size-4" aria-hidden />
                {mensaje}
              </span>
            )}

            {!esYo && (
              <Button
                variant="ghost"
                className="ml-auto text-danger-600"
                onClick={() =>
                  empezar(async () => {
                    const r = await cambiarActivo(usuario.id, !usuario.is_active);
                    if (!r.ok) setError(r.error);
                  })
                }
              >
                <UserX className="size-4" aria-hidden />
                {usuario.is_active ? "Desactivar" : "Reactivar"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Fila({
  etiqueta,
  ayuda,
  activo,
  onChange,
}: {
  etiqueta: string;
  ayuda?: string;
  activo: boolean;
  onChange: (activo: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className="flex w-full items-center gap-3 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{etiqueta}</span>
        {ayuda && (
          <span className="block text-sm text-ink-secondary">{ayuda}</span>
        )}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          activo ? "bg-brand-600" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
            activo ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
