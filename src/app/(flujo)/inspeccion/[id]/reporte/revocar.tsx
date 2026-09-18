"use client";

import { Ban } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { revocarVerificacion } from "./acciones";

/** Apaga el enlace del QR. Quien lo escanee después ya no ve nada. */
export function RevocarQr({ inspeccionId }: { inspeccionId: string }) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  if (!confirmar) {
    return (
      <Button variant="ghost" className="text-danger-600" onClick={() => setConfirmar(true)}>
        <Ban className="size-4" aria-hidden />
        Revocar QR
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger-500/30 bg-danger-50 p-3 dark:bg-danger-500/10">
      <p className="text-sm text-ink">
        Quien escanee el código ya no va a poder verificar esta inspección.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setConfirmar(false)}>
          No revocar
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          loading={pendiente}
          onClick={() =>
            empezar(async () => {
              const r = await revocarVerificacion(inspeccionId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          Revocar
        </Button>
      </div>
    </div>
  );
}
