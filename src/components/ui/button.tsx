"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Botón.
 *
 * Detalles que hacen que se sienta app y no página:
 *   · `active:scale-[0.97]` — hunde al tocar, como un botón nativo.
 *   · altura mínima de 44px en la talla por defecto.
 *   · el estado de carga conserva el ancho para que la fila no brinque.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variantes: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 " +
    "disabled:bg-brand-600/40",
  secondary:
    "bg-surface-raised text-ink border border-line hover:border-line-strong " +
    "active:bg-surface-sunken disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-secondary hover:bg-surface-sunken " +
    "active:bg-surface-sunken disabled:opacity-50",
  danger:
    "bg-danger-600 text-white shadow-sm hover:bg-danger-700 " +
    "disabled:bg-danger-600/40",
  success:
    "bg-ok-600 text-white shadow-sm hover:bg-ok-700 disabled:bg-ok-600/40",
};

const tallas: Record<Size, string> = {
  sm: "h-10 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "min-h-11 px-4 py-2.5 text-base gap-2 rounded-xl",
  lg: "min-h-14 px-6 py-3.5 text-lg gap-2.5 rounded-2xl font-semibold",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Ocupa todo el ancho. En móvil es lo normal para la acción principal. */
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      block = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-[background-color,transform,opacity] duration-100",
          "active:scale-[0.97] disabled:active:scale-100",
          "disabled:cursor-not-allowed select-none",
          variantes[variant],
          tallas[size],
          block && "w-full",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
