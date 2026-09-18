export type EstadoMiembro =
  | "en_equipo"
  | "invitacion_enviada"
  | "correo_no_salio"
  | "fuera";

/**
 * Estado visible de alguien del equipo.
 *
 * "En el equipo" es quien ya entró. Mientras no entre, la invitación sigue
 * pendiente — y si el correo no salió, el admin tiene que pasarle los datos
 * en mano.
 */
export function estadoDelMiembro(opts: {
  activo: boolean;
  ultimaEntrada: string | null;
  correoEnviado: boolean | null;
}): EstadoMiembro {
  if (!opts.activo) return "fuera";
  if (opts.ultimaEntrada) return "en_equipo";
  if (opts.correoEnviado === false) return "correo_no_salio";
  return "invitacion_enviada";
}
