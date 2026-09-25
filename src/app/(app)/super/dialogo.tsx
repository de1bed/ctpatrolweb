"use client";

import { Button } from "@/components/ui/button";

export function DialogoDosPasos({
  titulo,
  mensaje,
  pendiente,
  error,
  onNo,
  onSi,
}: {
  titulo: string;
  mensaje: string;
  pendiente: boolean;
  error: string | null;
  onNo: () => void;
  onSi: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!pendiente) onNo();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full rounded-t-3xl bg-surface p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <h2 className="text-xl font-bold text-ink">{titulo}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{mensaje}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={pendiente} onClick={onNo}>
            No
          </Button>
          <Button variant="danger" className="flex-1" loading={pendiente} onClick={onSi}>
            Sí
          </Button>
        </div>
      </div>
    </div>
  );
}
