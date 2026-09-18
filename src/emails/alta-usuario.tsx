import { Text } from "react-email";

import { Boton, Dato, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoAltaUsuario({
  nombre,
  empresa,
  rol,
  email,
  password,
  urlEntrar,
}: {
  nombre: string;
  empresa: string;
  rol: string;
  email: string;
  password: string;
  urlEntrar: string;
}) {
  return (
    <MarcoCorreo preview={`Tu cuenta de ${empresa} ya está lista en CTPatrol.`}>
      <Titulo>Ya puedes entrar a CTPatrol</Titulo>
      <Parrafo>Hola {nombre},</Parrafo>
      <Parrafo>
        Te dieron de alta en <strong>{empresa}</strong> como {rol}. Entra con
        estos datos y cambia la contraseña en Ajustes: esta es temporal.
      </Parrafo>
      <Dato etiqueta="Correo" valor={email} />
      <Dato etiqueta="Contraseña temporal" valor={password} />
      <Boton href={urlEntrar}>Entrar</Boton>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        No reenvíes este correo. Quien lo tenga puede entrar con tu cuenta.
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
};
