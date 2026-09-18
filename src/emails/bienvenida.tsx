import { Boton, Dato, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoBienvenida({
  nombre,
  empresa,
  urlEntrar,
}: {
  nombre: string;
  empresa: string;
  urlEntrar: string;
}) {
  return (
    <MarcoCorreo preview={`${empresa} ya tiene cuenta en CTPatrol.`}>
      <Titulo>Tu empresa ya está registrada</Titulo>
      <Parrafo>Hola {nombre},</Parrafo>
      <Parrafo>
        La cuenta de <strong>{empresa}</strong> quedó creada y tú eres el
        administrador. Desde el panel das de alta a los inspectores.
      </Parrafo>
      <Dato etiqueta="Empresa" valor={empresa} />
      <Boton href={urlEntrar}>Abrir CTPatrol</Boton>
    </MarcoCorreo>
  );
}

CorreoBienvenida.PreviewProps = {
  nombre: "María López",
  empresa: "Transportes del Norte",
  urlEntrar: "http://localhost:3100/login",
};
