"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/field";

export function CampoPassword({
  id,
  name,
  autoComplete,
  placeholder = "••••••••",
  disabled,
  required,
  minLength,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden />
        ) : (
          <Eye className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
