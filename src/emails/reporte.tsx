import { Link, Text } from "react-email";

import { Boton, Dato, MarcoCorreo, Parrafo, Titulo } from "./marco";

export function CorreoReporte({
  folio,
  empresa,
  transportista,
  resultado,
  urlVerificacion,
}: {
  folio: string;
  empresa: string;
  transportista: string | null;
  resultado: "aprobada" | "rechazada";
  urlVerificacion: string | null;
}) {
  const etiqueta = resultado === "aprobada" ? "APROBADA" : "RECHAZADA";

  return (
    <MarcoCorreo preview={`Inspección ${folio}: ${etiqueta}.`}>
      <Titulo>Inspección {folio}</Titulo>
      <Parrafo>
        {empresa} cerró una inspección C-TPAT. Este correo resume el resultado;
        el expediente completo queda en CTPatrol.
      </Parrafo>
      <Dato etiqueta="Folio" valor={folio} />
      {transportista ? <Dato etiqueta="Transportista" valor={transportista} /> : null}
      <Dato etiqueta="Resultado" valor={etiqueta} />
      {urlVerificacion ? (
        <>
          <Boton href={urlVerificacion}>Verificar autenticidad</Boton>
          <Text style={{ color: "#475569", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
            Enlace público:{" "}
            <Link href={urlVerificacion} style={{ color: "#0c77bd" }}>
              {urlVerificacion}
            </Link>
          </Text>
        </>
      ) : null}
    </MarcoCorreo>
  );
}

CorreoReporte.PreviewProps = {
  folio: "DEMO-260917-001",
  empresa: "Transportes Demo",
  transportista: "Logística del Pacífico",
  resultado: "aprobada" as const,
  urlVerificacion: "http://localhost:3100/evidencia/demo-token",
};
