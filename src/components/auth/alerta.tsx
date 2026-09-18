import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Alerta({
  tono = "error",
  children,
}: {
  tono?: "error" | "ok";
  children: ReactNode;
}) {
  const Icono = tono === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        tono === "error" &&
          "border-danger-500/30 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500",
        tono === "ok" &&
          "border-ok-500/30 bg-ok-50 text-ok-700 dark:bg-ok-500/10 dark:text-ok-500"
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
