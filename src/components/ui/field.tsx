"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Campo de formulario.
 *
 * Label, control, ayuda y error viven juntos en un solo componente porque
 * separarlos es como se pierden los vínculos de accesibilidad: el id del
 * input, el `htmlFor` del label y el `aria-describedby` del error tienen que
 * coincidir, y a mano eso se rompe en cuanto alguien copia y pega.
 */

export interface FieldProps {
  label: string;
  /** Texto de ayuda bajo el campo. Se oculta cuando hay error. */
  hint?: string;
  error?: string | null;
  required?: boolean;
  /** Marca el campo como precargado desde el panel admin. */
  prefilled?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  prefilled,
  className,
  children,
}: FieldProps) {
  const id = React.useId();
  const idAyuda = `${id}-ayuda`;
  const hayError = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-medium text-ink-secondary"
      >
        {label}
        {required && (
          <span className="text-danger-600" aria-label="obligatorio">
            *
          </span>
        )}
        {prefilled && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            Precargado
          </span>
        )}
      </label>

      {children({
        id,
        "aria-invalid": hayError,
        "aria-describedby": hint || error ? idAyuda : undefined,
      })}

      {hayError ? (
        <p
          id={idAyuda}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-danger-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={idAyuda} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const estiloControl =
  "w-full rounded-xl border bg-surface-raised px-3.5 py-3 text-ink " +
  "placeholder:text-ink-muted transition-colors " +
  "border-line focus:border-brand-500 focus:outline-none " +
  "focus:ring-4 focus:ring-brand-500/15 " +
  "aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-500/15 " +
  "disabled:bg-surface-sunken disabled:text-ink-muted disabled:cursor-not-allowed";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(estiloControl, className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(estiloControl, "resize-y", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(estiloControl, "pr-10", className)} {...props}>
      {children}
    </select>
  );
});
