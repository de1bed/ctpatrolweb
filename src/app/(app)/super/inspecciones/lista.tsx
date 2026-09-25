"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/inspection/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/supabase/database.types";

import { ControlesEmpresa } from "../controles";
import { ListaMiembros, type PersonaEmpresa } from "../miembros";

export type FilaSuper = {
  id: string;
  display_id: string;
  status: Database["public"]["Enums"]["inspection_status"];
  customer_name: string | null;
  tractor_number: string | null;
  driver_name: string | null;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

export type GrupoSuper = {
  id: string;
  name: string;
  code: string;
  activa: boolean;
  iaAutorizada: boolean;
  iaEncendida: boolean;
  creditos: number;
  usosIa: number;
  admins: PersonaEmpresa[];
  participantes: PersonaEmpresa[];
  filas: FilaSuper[];
};

const ESTADO: Record<FilaSuper["status"], string> = {
  draft: "borrador",
  assigned: "asignada",
  in_progress: "en curso",
  paused: "pausada",
  completed: "completada",
  cancelled: "cancelada",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function fechaVisible(fila: FilaSuper): string {
  if (fila.deleted_at) {
    return `Eliminada ${format(new Date(fila.deleted_at), "d MMM yyyy", { locale: es })} · quedan ${diasRestantes(fila.deleted_at)} días`;
  }
  const iso =
    fila.status === "completed" && fila.completed_at ? fila.completed_at : fila.updated_at;
  return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es });
}

function textoEmpresa(empresa: GrupoSuper): string {
  const gente = [...empresa.admins, ...empresa.participantes]
    .map((persona) => `${persona.nombre} ${persona.email}`)
    .join(" ");
  return normalizar(
    [
      empresa.name,
      empresa.code,
      empresa.activa ? "activa" : "suspendida",
      empresa.iaAutorizada ? "ia autorizada" : "sin autorizar",
      empresa.iaEncendida ? "ia encendida" : "ia apagada",
      `${empresa.creditos} creditos`,
      gente,
    ].join(" ")
  );
}
function textoBusqueda(empresa: GrupoSuper, fila: FilaSuper): string {
  return normalizar(
    [
      empresa.name,
      empresa.code,
      fila.display_id,
      fila.customer_name,
      fila.tractor_number,
      fila.driver_name,
      ESTADO[fila.status],
      fila.deleted_at ? "eliminada" : "",
      fechaVisible(fila),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function ListaSuper({
  grupos,
  recortada,
  yoId,
}: {
  grupos: GrupoSuper[];
  recortada: boolean;
  yoId: string;
}) {
  const [consulta, setConsulta] = useState("");
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [cerradasEnBusqueda, setCerradasEnBusqueda] = useState<Set<string>>(new Set());
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const buscando = palabras.length > 0;

  const visibles = grupos.flatMap((empresa) => {
    const coincideEmpresa =
      !buscando || palabras.every((palabra) => textoEmpresa(empresa).includes(palabra));
    const filas = coincideEmpresa
      ? empresa.filas
      : empresa.filas.filter((fila) =>
          palabras.every((palabra) => textoBusqueda(empresa, fila).includes(palabra))
        );
    if (buscando && !coincideEmpresa && filas.length === 0) return [];
    return [{ ...empresa, filas }];
  });

  const totalFilas = visibles.reduce((n, empresa) => n + empresa.filas.length, 0);

  function alternar(id: string) {
    const destino = buscando ? setCerradasEnBusqueda : setAbiertas;
    destino((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-gutter border-b border-line bg-surface/95 px-gutter py-3 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setCerradasEnBusqueda(new Set());
            }}
            placeholder="Empresa, folio, transportista o fecha"
            aria-label="Buscar inspección"
            className="pl-10"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            {visibles.length} {visibles.length === 1 ? "empresa" : "empresas"} · {totalFilas}{" "}
            {totalFilas === 1 ? "inspección" : "inspecciones"}
          </p>
          {!buscando && abiertas.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setAbiertas(new Set())}>
              Cerrar todas
            </Button>
          )}
        </div>
      </div>

      {recortada && (
        <p className="text-sm text-ink-secondary">
          Se muestran las 2,000 más recientes.
        </p>
      )}

      {visibles.length === 0 && (
        <Card className="p-6 text-sm text-ink-secondary">
          {buscando
            ? `Nada coincide con «${consulta.trim()}».`
            : "No hay empresas."}
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {visibles.map((empresa) => {
          const abierta = buscando
            ? !cerradasEnBusqueda.has(empresa.id)
            : abiertas.has(empresa.id);
          const panelId = `empresa-${empresa.id}`;
          const eliminadas = empresa.filas.filter((fila) => fila.deleted_at).length;
          const ultima = empresa.filas[0]
            ? format(new Date(empresa.filas[0].updated_at), "d MMM yyyy", { locale: es })
            : null;
          const estadoEmpresa = [
            empresa.code,
            empresa.activa ? "Activa" : "Suspendida",
            `${empresa.creditos} créditos`,
            empresa.iaAutorizada
              ? empresa.iaEncendida
                ? "IA encendida"
                : "IA autorizada"
              : "Sin IA",
            ultima ? `última ${ultima}` : "sin inspecciones",
            eliminadas > 0 ? `${eliminadas} eliminada${eliminadas === 1 ? "" : "s"}` : "",
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <section key={empresa.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <button
                type="button"
                aria-expanded={abierta}
                aria-controls={panelId}
                onClick={() => alternar(empresa.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-sunken"
              >
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-ink-muted transition-transform",
                    !abierta && "-rotate-90"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate font-semibold",
                      empresa.activa ? "text-ink" : "text-danger-700 dark:text-danger-500"
                    )}
                  >{empresa.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">{estadoEmpresa}</span>
                </span>
                <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-secondary">
                  {empresa.filas.length}
                </span>
              </button>

              {abierta && (
                <div id={panelId} className="border-t border-line">
                  <div className="flex flex-col gap-4 px-4 py-4">
                    <ControlesEmpresa
                      empresaId={empresa.id}
                      nombre={empresa.name}
                      autorizada={empresa.iaAutorizada}
                      creditos={empresa.creditos}
                      empresaActiva={empresa.activa}
                    />
                    <p className="text-xs text-ink-muted">
                      {empresa.usosIa} {empresa.usosIa === 1 ? "uso" : "usos"} de IA
                    </p>
                    <ListaMiembros titulo="Admins" personas={empresa.admins} yoId={yoId} />
                    <ListaMiembros
                      titulo="Participantes"
                      personas={empresa.participantes}
                      yoId={yoId}
                    />
                    {empresa.admins.length + empresa.participantes.length === 0 && (
                      <p className="text-sm text-ink-muted">Esta empresa no tiene personas.</p>
                    )}
                  </div>

                  <div className="border-t border-line">
                    <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Inspecciones · {empresa.filas.length}
                    </p>
                    {empresa.filas.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-ink-secondary">Sin inspecciones.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {empresa.filas.map((fila) => {
                          const detalle = [fila.customer_name, fila.tractor_number, fila.driver_name]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <Link
                              key={fila.id}
                              href={`/inspeccion/${fila.id}/reporte`}
                              className="flex flex-col gap-1 px-4 py-3 active:bg-surface-sunken"
                            >
                              <span className="flex flex-wrap items-center gap-2">
                                <StatusBadge estado={fila.status} />
                                {fila.deleted_at && (
                                  <span className="inline-flex items-center rounded-full border border-danger-500/40 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                                    Eliminada
                                  </span>
                                )}
                                <span className="font-mono text-sm font-medium text-ink">
                                  {fila.display_id}
                                </span>
                              </span>
                              <span className="text-sm text-ink-secondary">
                                {detalle || "Sin transportista"}
                              </span>
                              <span className="text-xs text-ink-muted">{fechaVisible(fila)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function diasRestantes(deletedAt: string): number {
  const vence = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((vence - Date.now()) / (24 * 60 * 60 * 1000)));
}
