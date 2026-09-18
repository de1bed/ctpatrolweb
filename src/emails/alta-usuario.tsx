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
        <strong>{empresa}</strong> como {rol}. Con esta cuenta entras a
        inspeccionar (o a administrar, si ese es tu rol).
      </Parrafo>
      <Dato etiqueta="Correo" valor={email} />
      <Dato etiqueta="Contraseña temporal" valor={password} />
      <Boton href={urlEntrar}>Entrar a CTPatrol</Boton>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Cambia la contraseña en Ajustes al entrar. No reenvíes este correo:
        quien lo tenga puede usar tu cuenta.
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
