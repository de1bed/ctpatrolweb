"use client";

import { Check, Copy, Mail, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Compartir el resultado de la inspección.
 *
 * ── Por qué no manda correos desde el servidor ──────────────────────────────
 *
 * El envío transaccional necesita un proveedor (Resend, SES, SendGrid), un
 * dominio verificado y registros SPF/DKIM. Sin eso, un correo enviado desde
 * el servidor termina en spam, que es peor que no mandarlo: el admin cree
 * que llegó y nadie lo leyó.
 *
 * Mientras tanto esto sí funciona hoy, con lo que el dispositivo ya tiene:
 * el menú nativo de compartir en móvil, y el cliente de correo del usuario
 * en escritorio. El correo sale de la cuenta real del inspector, así que
 * llega y se puede responder.
 */
export function CompartirReporte({
  folio,
  urlVerificacion,
  resultado,
  transportista,
}: {
  folio: string;
  urlVerificacion: string | null;
  resultado: "aprobada" | "rechazada" | null;
  transportista: string | null;
}) {
  const [copiado, setCopiado] = useState(false);

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
    // El menú nativo de compartir solo existe en móvil y requiere HTTPS.
    // En escritorio no está, y por eso siempre hay alternativa visible.
    if (navigator.share) {
      try {
        await navigator.share({ title: asunto, text: cuerpo });
        return;
      } catch {
        // El usuario canceló el menú. No es un error que valga mensaje.
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
      // Sin permiso de portapapeles no hay mucho que hacer; el usuario
      // siempre puede seleccionar el texto del reporte a mano.
    }
  }

  return (
    <div className="no-imprimir mx-auto flex max-w-3xl flex-wrap gap-2 px-gutter pb-6">
      <Button variant="secondary" onClick={compartir} className="flex-1">
        <Share2 className="size-4" aria-hidden />
        Compartir
      </Button>

      <a
        href={`mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`}
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl",
          "border border-line bg-surface-raised px-4 text-base font-medium text-ink",
          "transition-colors active:bg-surface-sunken"
        )}
      >
        <Mail className="size-4" aria-hidden />
        Enviar por correo
      </a>

      <Button variant="secondary" onClick={copiar} className="flex-1">
        {copiado ? (
          <Check className="size-4 text-ok-600" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copiado ? "Copiado" : "Copiar datos"}
      </Button>
    </div>
  );
}
