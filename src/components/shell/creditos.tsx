"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const Contexto = createContext<{
  creditos: number;
  fijar: (n: number) => void;
} | null>(null);

export function CreditosProvider({
  inicial,
  children,
}: {
  inicial: number;
  children: ReactNode;
}) {
  const [creditos, setCreditos] = useState(inicial);
  return (
    <Contexto.Provider value={{ creditos, fijar: setCreditos }}>
      {children}
    </Contexto.Provider>
  );
}

export function useCreditos(): {
  creditos: number;
  fijar: (n: number) => void;
} | null {
  return useContext(Contexto);
}

/** Saldo de la empresa, visible para cualquier rol. */
export function PastillaCreditos() {
  const ctx = useCreditos();
  if (!ctx) return null;
  return (
    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      {ctx.creditos} créditos
    </span>
  );
}
