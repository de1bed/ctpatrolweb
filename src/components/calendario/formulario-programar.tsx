"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { crearAsignada } from "@/app/(app)/admin/inspecciones/acciones";
import {
  CatalogPicker,
  type SeleccionCatalogo,
} from "@/components/inspection/catalog-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CAPACIDADES, TIPOS_TRANSPORTE, type TipoTransporte } from "@/lib/inspection/transporte";

function uuidONulo(valor: string | null | undefined): string | null {
  return valor &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
    ? valor
    : null;
}

/**
 * Alta precargada desde el panel.
 *
 * El admin llena lo que ya sabe —quién, cuándo, transportista, unidad—
 * y el inspector lo ve al abrir. Nada de esto es obligatorio: a veces
 * solo se sabe que el martes hay que cubrir un turno.
 */
export function FormularioProgramar({
  inspectores,
  abierto,
  onCerrar,
  fechaInicial,
  inspectorInicial,
}: {
  inspectores: { id: string; nombre: string }[];
  abierto: boolean;
  onCerrar: () => void;
  fechaInicial?: string;
  inspectorInicial?: string;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [inspectorId, setInspectorId] = useState("");
  const [programada, setProgramada] = useState("");
  const [cliente, setCliente] = useState<SeleccionCatalogo | null>(null);
  const [tractor, setTractor] = useState<SeleccionCatalogo | null>(null);
  const [conductor, setConductor] = useState<SeleccionCatalogo | null>(null);
  const [tipo, setTipo] = useState<TipoTransporte | "">("");

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setInspectorId(inspectorInicial ?? "");
    setProgramada(fechaInicial ?? "");
    setCliente(null);
    setTractor(null);
    setConductor(null);
    setTipo("");
  }, [abierto, fechaInicial, inspectorInicial]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Programar inspección"
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Programar inspección</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Lo que llenes aquí lo ve el inspector al abrirla. Puede
              confirmarlo o cambiarlo en campo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
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
            hint="Si la dejas sin asignar, no aparece en el calendario del inspector."
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
            label="Programada para"
            hint="Ese día y hora aparecen en el calendario."
          >
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={programada}
                onChange={(e) => setProgramada(e.target.value)}
              />
            )}
          </Field>

          <CatalogPicker
            tipo="cliente"
            etiqueta="Transportista"
            placeholder="Buscar por nombre"
            etiquetaDetalle="RFC (opcional)"
            puedeCrear
            required={false}
            seleccionado={cliente}
            onSeleccionar={setCliente}
          />

          <CatalogPicker
            tipo="tractor"
            etiqueta="Unidad"
            placeholder="Buscar por número"
            etiquetaDetalle="Placas"
            puedeCrear
            required={false}
            seleccionado={tractor}
            onSeleccionar={setTractor}
          />

          <CatalogPicker
            tipo="conductor"
            etiqueta="Conductor"
            placeholder="Buscar por nombre"
            etiquetaDetalle="Licencia"
            puedeCrear
            required={false}
            seleccionado={conductor}
            onSeleccionar={setConductor}
          />

          <Field label="Tipo de transporte">
            {(p) => (
              <Select
                {...p}
                value={tipo}
                onChange={(e) =>
                  setTipo((e.target.value || "") as TipoTransporte | "")
                }
              >
                <option value="">Sin definir</option>
                {TIPOS_TRANSPORTE.map((t) => (
                  <option key={t} value={t}>
                    {CAPACIDADES[t].nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Button
            block
            loading={pendiente}
            onClick={() =>
              empezar(async () => {
                setError(null);
                const r = await crearAsignada({
                  inspectorId: uuidONulo(inspectorId),
                  clienteId: uuidONulo(cliente?.id),
                  clienteNombre: cliente?.nombre || undefined,
                  tractorId: uuidONulo(tractor?.id),
                  tractorNumero: tractor?.nombre || undefined,
                  tractorPlacas: tractor?.detalle || undefined,
                  conductorId: uuidONulo(conductor?.id),
                  conductorNombre: conductor?.nombre || undefined,
                  conductorLicencia: conductor?.detalle || undefined,
                  tipoTransporte: tipo || null,
                  programadaPara: programada
                    ? new Date(programada).toISOString()
                    : null,
                });
                if (r.ok) onCerrar();
                else setError(r.error);
              })
            }
          >
            Guardar en el calendario
          </Button>
        </div>
      </div>
    </div>
  );
}
