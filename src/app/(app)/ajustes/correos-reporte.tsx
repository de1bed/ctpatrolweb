"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";

import { guardarCorreosReporte, type EstadoCorreos } from "./acciones";

const inicial: EstadoCorreos = { error: null, ok: false };

export function CorreosReporte({ valorInicial }: { valorInicial: string }) {
  const [estado, accion, enviando] = useActionState(
    guardarCorreosReporte,
    inicial
  );

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
        Correos del reporte
      </h2>
      <p className="mb-4 text-sm text-ink-secondary">
        Al cerrar una inspección, CTPatrol manda el resumen (folio, resultado y
        enlace de verificación) a esta lista. Tú también puedes enviarlo a mano
        desde el reporte.
      </p>

      <form action={accion} className="flex flex-col gap-3">
        {estado.error && <Alerta>{estado.error}</Alerta>}
        {estado.ok && <Alerta tono="ok">Lista guardada.</Alerta>}
        <Field
          label="Destinatarios"
          hint="Uno por línea o separados por coma."
        >
          {(props) => (
            <Textarea
              {...props}
              name="correos"
              rows={4}
              defaultValue={valorInicial}
              placeholder="calidad@empresa.com"
              disabled={enviando}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        <Button type="submit" variant="secondary" loading={enviando}>
          {enviando ? "Guardando…" : "Guardar correos"}
        </Button>
      </form>
    </Card>
  );
}
