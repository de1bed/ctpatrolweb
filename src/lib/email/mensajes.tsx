import "server-only";

import { CorreoAltaUsuario } from "@/emails/alta-usuario";
import { CorreoBienvenida } from "@/emails/bienvenida";
import { CorreoRecuperar } from "@/emails/recuperar";
import { CorreoReporte } from "@/emails/reporte";
import { CorreoVerificar } from "@/emails/verificar";

import { enviarCorreo, type ResultadoCorreo } from "./enviar";

export function enviarAltaUsuario(opts: {
  to: string;
  nombre: string;
  empresa: string;
  rol: string;
  email: string;
  password: string;
  urlEntrar: string;
}): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: opts.to,
    subject: `Tu cuenta de ${opts.empresa} en CTPatrol`,
    react: (
      <CorreoAltaUsuario
        nombre={opts.nombre}
        empresa={opts.empresa}
        rol={opts.rol}
        email={opts.email}
        password={opts.password}
        urlEntrar={opts.urlEntrar}
      />
    ),
    idempotencyKey: `alta-usuario/${opts.email}`,
  });
}

export function enviarBienvenida(opts: {
  to: string;
  nombre: string;
  empresa: string;
  urlEntrar: string;
}): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: opts.to,
    subject: `${opts.empresa} ya tiene cuenta en CTPatrol`,
    react: (
      <CorreoBienvenida
        nombre={opts.nombre}
        empresa={opts.empresa}
        urlEntrar={opts.urlEntrar}
      />
    ),
    idempotencyKey: `bienvenida/${opts.to}`,
  });
}

export function enviarVerificacion(opts: {
  to: string;
  nombre: string;
  empresa: string;
  codigo: string;
}): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: opts.to,
    subject: `Tu código de CTPatrol es ${opts.codigo}`,
    react: (
      <CorreoVerificar
        nombre={opts.nombre}
        empresa={opts.empresa}
        codigo={opts.codigo}
      />
    ),
    idempotencyKey: `verificar-correo/${opts.to}/${opts.codigo}`.slice(0, 256),
  });
}

export function enviarRecuperacion(opts: {
  to: string;
  nombre: string;
  url: string;
}): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: opts.to,
    subject: "Restablecer contraseña de CTPatrol",
    react: <CorreoRecuperar nombre={opts.nombre} url={opts.url} />,
    idempotencyKey: `recuperar/${opts.to}/${Math.floor(Date.now() / 60_000)}`,
  });
}

export function enviarResumenReporte(opts: {
  to: string[];
  folio: string;
  empresa: string;
  transportista: string | null;
  resultado: "aprobada" | "rechazada";
  urlVerificacion: string | null;
  idempotencyKey: string;
}): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: opts.to,
    subject: `Inspección C-TPAT ${opts.folio} · ${opts.resultado === "aprobada" ? "Aprobada" : "Rechazada"}`,
    react: (
      <CorreoReporte
        folio={opts.folio}
        empresa={opts.empresa}
        transportista={opts.transportista}
        resultado={opts.resultado}
        urlVerificacion={opts.urlVerificacion}
      />
    ),
    idempotencyKey: opts.idempotencyKey,
  });
}
