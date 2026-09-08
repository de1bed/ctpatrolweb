"use client";

import { AlertCircle, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import { crearAsignada } from "./acciones";

/**
 * Alta de inspección desde el panel.
 *
 * El admin la crea vacía y la asigna; el inspector la completa en campo. Es
 * el caso normal en una empresa donde el inspector no decide qué revisar:
 * llega, ve su lista y la trabaja.
 *
 * El transportista es opcional a propósito: a veces se sabe qué unidad viene
 * y a veces solo se sabe que habrá inspecciones ese turno.
 */
export function NuevaAsignada({
  inspectores,
}: {
  inspectores: { id: string; nombre: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [inspectorId, setInspectorId] = useState("");
  const [cliente, setCliente] = useState("");
  const [programada, setProgramada] = useState("");

  function cerrar() {
    setAbierto(false);
    setError(null);
    setInspectorId("");
    setCliente("");
    setProgramada("");
  }

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <Plus className="size-5" aria-hidden />
        Nueva inspección
      </Button>
    );
  }

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
        aria-label="Nueva inspección"
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">Nueva inspección</h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Field
            label="Asignar a"
            hint="Puedes dejarla sin asignar y repartirla después."
          >
            {(p) => (
              <Select
                {...p}
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {inspectores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Transportista"
            hint="Opcional. El inspector lo confirma o lo captura en campo."
          >
            {(p) => (
              <Input
                {...p}
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Fletes del Norte"
              />
            )}
          </Field>

          <Field label="Programada para" hint="Opcional.">
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={programada}
                onChange={(e) => setProgramada(e.target.value)}
              />
            )}
          </Field>

          <Button
            block
            loading={pendiente}
            onClick={() =>
              empezar(async () => {
                setError(null);
                const r = await crearAsignada({
                  inspectorId: inspectorId || null,
                  clienteNombre: cliente.trim() || undefined,
                  // datetime-local no trae zona; se convierte a ISO con la
                  // del navegador, que es la del patio donde se programó.
                  programadaPara: programada
                    ? new Date(programada).toISOString()
                    : null,
                });
                if (r.ok) cerrar();
                else setError(r.error);
              })
            }
          >
            Crear inspección
          </Button>
        </div>
      </div>
    </div>
  );
}
