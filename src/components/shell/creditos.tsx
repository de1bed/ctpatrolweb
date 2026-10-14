"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const Contexto = createContext<{
  creditos: number;
  fijar: (n: number) => void;
  esAdmin: boolean;
  iaAutorizada: boolean;
} | null>(null);

export function CreditosProvider({
  inicial,
  esAdmin,
  iaAutorizada,
  children,
}: {
  inicial: number;
  esAdmin: boolean;
  /** El super admin ya autorizó la IA para esta empresa. */
  iaAutorizada: boolean;
  children: ReactNode;
}) {
  const [creditos, setCreditos] = useState(inicial);
  return (
    <Contexto.Provider value={{ creditos, fijar: setCreditos, esAdmin, iaAutorizada }}>
      {children}
    </Contexto.Provider>
  );
}

export function useCreditos(): {
  creditos: number;
  fijar: (n: number) => void;
  esAdmin: boolean;
  iaAutorizada: boolean;
} | null {
  return useContext(Contexto);
}

/** Saldo de la empresa, visible para cualquier rol. */
export function PastillaCreditos() {
  const ctx = useCreditos();
  if (!ctx) return null;
  const agotados = ctx.iaAutorizada && ctx.creditos === 0;
  return (
    <span
      className={
        agotados
          ? "shrink-0 rounded-full bg-warn-50 px-2.5 py-1 text-xs font-semibold text-warn-700 dark:bg-warn-500/15 dark:text-warn-500"
          : "shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
      }
    >
      {ctx.creditos} créditos
    </span>
  );
}

/**
 * Aviso fijo del encabezado cuando la empresa ya no puede usar la IA.
 * No aparece si la IA nunca estuvo autorizada: en ese caso el saldo en
 * cero es el estado normal, no un aviso.
 */
export function AvisoCreditos() {
  const ctx = useCreditos();
  if (!ctx || !ctx.iaAutorizada || ctx.creditos > 0) return null;
  return (
    <p
      role="status"
      className="border-b border-warn-500/40 bg-warn-50 px-gutter py-2 text-center text-sm font-medium text-ink dark:bg-warn-500/10"
    >
      {ctx.esAdmin
        ? "Se acabaron los créditos de IA. Actualiza tus créditos."
        : "Se acabaron los créditos de IA. Consulta a tu administrador para recargar créditos de IA."}
    </p>
  );
}
