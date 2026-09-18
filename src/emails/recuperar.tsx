import { Link, Text } from "react-email";

import { Boton, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoRecuperar({
  nombre,
  url,
}: {
  nombre: string;
  url: string;
}) {
  return (
    <MarcoCorreo preview="Enlace para elegir una contraseña nueva. Caduca en una hora.">
      <Titulo>Restablecer contraseña</Titulo>
      <Parrafo>Hola{nombre ? ` ${nombre}` : ""},</Parrafo>
      <Parrafo>
        Pediste una contraseña nueva para CTPatrol. El enlace caduca en una hora
        y solo sirve una vez.
      </Parrafo>
      <Boton href={url}>Elegir contraseña nueva</Boton>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Si el botón no abre, copia este enlace:{" "}
        <Link href={url} style={{ color: "#0c77bd" }}>
          {url}
        </Link>
      </Text>
    </MarcoCorreo>
  );
}

CorreoRecuperar.PreviewProps = {
  nombre: "Ana Delgado",
  url: "http://localhost:3100/auth/callback?token_hash=demo&type=recovery",
};
