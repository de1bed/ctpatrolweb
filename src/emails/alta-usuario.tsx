import { Text } from "react-email";

import { Boton, Dato, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoAltaUsuario({
  nombre,
  empresa,
  rol,
  email,
  password,
  urlEntrar,
  invitador,
}: {
  nombre: string;
  empresa: string;
  rol: string;
  email: string;
  password: string;
  urlEntrar: string;
  invitador: string;
}) {
  return (
    <MarcoCorreo preview={`${invitador} te invitó al equipo de ${empresa} en CTPatrol.`}>
      <Titulo>Te invitaron a CTPatrol</Titulo>
      <Parrafo>Hola {nombre},</Parrafo>
      <Parrafo>
        <strong>{invitador}</strong> te dio de alta en el equipo de{" "}
        <strong>{empresa}</strong> como {rol}. Entra a tu cuenta en este
        enlace, con estos accesos.
      </Parrafo>
      <Dato etiqueta="Enlace" valor={urlEntrar} />
      <Dato etiqueta="Correo" valor={email} />
      <Dato etiqueta="Contraseña temporal" valor={password} />
      <Boton href={urlEntrar}>Entrar a CTPatrol</Boton>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Si este correo no te aparece en la bandeja, entra igual con el enlace
        y los accesos de arriba. Cambia la contraseña en Ajustes al entrar.
      </Text>
    </MarcoCorreo>
  );
}

CorreoAltaUsuario.PreviewProps = {
  nombre: "Juan Pérez",
  empresa: "Transportes Demo",
  rol: "inspector",
  email: "inspector@demo.mx",
  password: "TemporalDemo12",
  urlEntrar: "http://localhost:3100/login",
  invitador: "María López",
};
