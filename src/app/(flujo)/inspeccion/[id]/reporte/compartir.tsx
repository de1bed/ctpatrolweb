"use client";

import { Check, Copy, Mail, Share2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Alerta } from "@/components/auth/alerta";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

import { enviarReportePorCorreo, type EstadoEnvio } from "./acciones";

const inicial: EstadoEnvio = { error: null, enviado: false };

/**
 * Compartir el resultado de la inspección.
 *
 * El envío transaccional sale por Resend (dominio verificado). El menú nativo
 * y copiar siguen ahí para cuando el inspector quiere mandarlo por WhatsApp
 * o desde su propio correo.
 */
export function CompartirReporte({
  inspeccionId,
  folio,
  urlVerificacion,
  resultado,
  transportista,
  destinosIniciales,
  correoListo,
}: {
  inspeccionId: string;
  folio: string;
  urlVerificacion: string | null;
  resultado: "aprobada" | "rechazada" | null;
  transportista: string | null;
  destinosIniciales: string;
  correoListo: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const [estado, accion, enviando] = useActionState(
    enviarReportePorCorreo,
    inicial
  );

  const asunto = `Inspección C-TPAT ${folio}${
    resultado ? ` · ${resultado === "aprobada" ? "Aprobada" : "Rechazada"}` : ""
  }`;

  const cuerpo = [
    `Inspección de seguridad C-TPAT`,
    ``,
    `Folio: ${folio}`,
    transportista ? `Transportista: ${transportista}` : null,
    resultado
      ? `Resultado: ${resultado === "aprobada" ? "APROBADA" : "RECHAZADA"}`
      : null,
    ``,
    urlVerificacion ? `Verificar autenticidad: ${urlVerificacion}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: asunto, text: cuerpo });
        return;
      } catch {
        // El usuario canceló el menú.
      }
    }
    await copiar();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cuerpo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles.
    }
  }

  return (
    <div className="no-imprimir mx-auto max-w-3xl px-gutter pb-10">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={compartir} className="flex-1">
          <Share2 className="size-4" aria-hidden />
          Compartir
        </Button>

        <Button variant="secondary" onClick={copiar} className="flex-1">
          {copiado ? (
            <Check className="size-4 text-ok-600" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copiado ? "Copiado" : "Copiar datos"}
        </Button>
      </div>

      {correoListo ? (
        <form
          action={accion}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
        >
          <input type="hidden" name="inspeccionId" value={inspeccionId} />
          {estado.error && <Alerta>{estado.error}</Alerta>}
          {estado.enviado && (
            <Alerta tono="ok">El resumen salió hacia esos correos.</Alerta>
          )}
          <Field
            label="Enviar resumen por correo"
            hint="Separa varios correos con coma. El expediente completo no viaja: viaja el folio y el enlace de verificación."
          >
            {(props) => (
              <Input
                {...props}
                name="destinatarios"
                type="text"
                required
                defaultValue={destinosIniciales}
                placeholder="calidad@empresa.com, cliente@transportista.com"
                disabled={enviando}
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
          <Button type="submit" loading={enviando}>
            <Mail className="size-4" aria-hidden />
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </form>
      ) : (
        <a
          href={`mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-xl",
            "border border-line bg-surface-raised px-4 text-base font-medium text-ink"
          )}
        >
          <Mail className="size-4" aria-hidden />
          Enviar por correo
        </a>
      )}
    </div>
  );
}
