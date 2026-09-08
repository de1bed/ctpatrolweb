import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Tarjeta: la unidad de contenido de toda la app.
 *
 * En móvil las tarjetas van a ancho completo con márgenes laterales; en iPad
 * y escritorio se acomodan en rejilla. El componente no decide eso — lo
 * decide el contenedor — para que la misma tarjeta sirva en los tres tamaños.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface-raised",
        "shadow-[var(--shadow-card)]",
        interactive &&
          "transition-transform duration-100 active:scale-[0.99] cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pt-4 pb-2", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-tight text-ink", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-line px-4 py-3", className)}
      {...props}
    />
  );
}
