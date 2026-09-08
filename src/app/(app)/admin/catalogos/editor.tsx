"use client";

import { AlertCircle, Check, Pencil, Plus, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

import {
  desactivarCatalogo,
  guardarCatalogo,
  persistirEfimero,
} from "./acciones";
import type { TipoCatalogo } from "./config";

export type ItemCatalogo = {
  id: string;
  principal: string;
  secundario: string | null;
  activo: boolean;
  efimero: boolean;
};

/**
 * Fila de catálogo con edición en línea.
 *
 * Sin `item` funciona como botón de alta; con `item`, como fila editable.
 * Es el mismo formulario en los dos casos, así que compartirlo evita que el
 * alta y la edición se desincronicen con el tiempo.
 */
export function EditorCatalogo({
  tipo,
  etiquetas,
  item,
}: {
  tipo: TipoCatalogo;
  etiquetas: { principal: string; secundario: string };
  item?: ItemCatalogo;
}) {
  const [editando, setEditando] = useState(false);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [principal, setPrincipal] = useState(item?.principal ?? "");
  const [secundario, setSecundario] = useState(item?.secundario ?? "");

  function cerrar() {
    setEditando(false);
    setError(null);
    if (item) {
      setPrincipal(item.principal);
      setSecundario(item.secundario ?? "");
    } else {
      setPrincipal("");
      setSecundario("");
    }
  }

  // ── Botón de alta ───────────────────────────────────────────────────
  if (!item && !editando) {
    return (
      <Button onClick={() => setEditando(true)}>
        <Plus className="size-5" aria-hidden />
        Agregar
      </Button>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────
  if (editando) {
    const contenido = (
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Field label={etiquetas.principal} required>
          {(p) => (
            <Input
              {...p}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>

        <Field label={etiquetas.secundario}>
          {(p) => (
            <Input
              {...p}
              value={secundario}
              onChange={(e) => setSecundario(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            loading={pendiente}
            disabled={!principal.trim()}
            onClick={() =>
              empezar(async () => {
                setError(null);
                const r = await guardarCatalogo({
                  tipo,
                  id: item?.id,
                  principal: principal.trim(),
                  secundario: secundario.trim() || undefined,
                });
                if (r.ok) cerrar();
                else setError(r.error);
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    );

    // El alta va en diálogo; la edición, en la propia fila.
    if (!item) {
      return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={cerrar}
            className="absolute inset-0 bg-black/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo registro"
            className="relative w-full rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">Nuevo registro</h2>
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar"
                className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            {contenido}
          </div>
        </div>
      );
    }

    return <Card className="p-4">{contenido}</Card>;
  }

  // ── Fila ────────────────────────────────────────────────────────────
  return (
    <Card className={cn("p-3", !item!.activo && "opacity-55")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{item!.principal}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
            {item!.secundario && <span className="truncate">{item!.secundario}</span>}
            {item!.efimero && (
              <span className="rounded-full bg-warn-50 px-2 py-0.5 text-xs font-medium text-warn-700 dark:bg-warn-500/10 dark:text-warn-500">
                Capturado en campo
              </span>
            )}
            {!item!.activo && (
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">
                Dado de baja
              </span>
            )}
          </p>
        </div>

        {item!.efimero && (
          <Button
            size="sm"
            variant="secondary"
            loading={pendiente}
            onClick={() =>
              empezar(async () => {
                const r = await persistirEfimero(tipo, item!.id);
                if (!r.ok) setError(r.error);
              })
            }
          >
            <Sparkles className="size-4" aria-hidden />
            Conservar
          </Button>
        )}

        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${item!.principal}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary transition-colors active:bg-surface-sunken"
        >
          <Pencil className="size-5" aria-hidden />
        </button>

        <button
          type="button"
          aria-label={item!.activo ? `Dar de baja ${item!.principal}` : `Reactivar ${item!.principal}`}
          onClick={() =>
            empezar(async () => {
              const r = await desactivarCatalogo(tipo, item!.id, !item!.activo);
              if (!r.ok) setError(r.error);
            })
          }
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors active:bg-surface-sunken",
            item!.activo ? "text-danger-600" : "text-ok-600"
          )}
        >
          {item!.activo ? <X className="size-5" aria-hidden /> : <Check className="size-5" aria-hidden />}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-600">
          {error}
        </p>
      )}
    </Card>
  );
}
