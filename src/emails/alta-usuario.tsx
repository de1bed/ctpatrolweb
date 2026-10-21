import { Link, Text } from "react-email";

import { Boton, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoAltaUsuario({
  nombre,
  empresa,
  rol,
  urlInvitacion,
  invitador,
}: {
  nombre: string;
  empresa: string;
  rol: string;
  urlInvitacion: string;
  invitador: string;
}) {
  return (
    <MarcoCorreo preview={`${invitador} te invitó al equipo de ${empresa} en CTPatrol.`}>
      <Titulo>Te invitaron a CTPatrol</Titulo>
      <Parrafo>Hola {nombre},</Parrafo>
      <Parrafo>
        <strong>{invitador}</strong> te dio de alta en el equipo de{" "}
        <strong>{empresa}</strong> como {rol}. Entra con el botón de abajo para
        elegir tu contraseña y activar tu cuenta.
      </Parrafo>
      <Boton href={urlInvitacion}>Activar mi cuenta</Boton>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Este enlace es de un solo uso y caduca en 7 días. Si el botón no abre,
        copia este enlace:{" "}
        <Link href={urlInvitacion} style={{ color: "#0c77bd" }}>
          {urlInvitacion}
        </Link>
      </Text>
    </MarcoCorreo>
  );
}

CorreoAltaUsuario.PreviewProps = {
  nombre: "Juan Pérez",
  empresa: "Transportes Demo",
  rol: "inspector",
  urlInvitacion: "http://localhost:3100/auth/callback?token_hash=demo&type=invite&next=/invitacion/activar",
  invitador: "María López",
};
