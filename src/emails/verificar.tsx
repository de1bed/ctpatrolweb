import { Text } from "react-email";

import { Dato, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoVerificar({
  nombre,
  empresa,
  codigo,
}: {
  nombre: string;
  empresa: string;
  codigo: string;
}) {
  return (
    <MarcoCorreo preview={`Tu código de CTPatrol es ${codigo}. Caduca en una hora.`}>
      <Titulo>Tu código de verificación</Titulo>
      <Parrafo>Hola{nombre ? ` ${nombre}` : ""},</Parrafo>
      <Parrafo>
        Para activar la cuenta de <strong>{empresa || "tu empresa"}</strong> en
        CTPatrol, escribe este código en la app. Caduca en una hora.
      </Parrafo>
      {empresa ? <Dato etiqueta="Empresa" valor={empresa} /> : null}
      <Text
        style={{
          backgroundColor: "#f1f5f9",
          borderRadius: "12px",
          color: "#0f172a",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: "32px",
          fontWeight: 700,
          letterSpacing: "0.28em",
          lineHeight: "40px",
          margin: "20px 0",
          padding: "16px 12px",
          textAlign: "center",
        }}
      >
        {codigo}
      </Text>
      <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Si no pediste esta cuenta, ignora este correo.
      </Text>
    </MarcoCorreo>
  );
}

CorreoVerificar.PreviewProps = {
  nombre: "María López",
  empresa: "Transportes del Norte",
  codigo: "184029",
};
