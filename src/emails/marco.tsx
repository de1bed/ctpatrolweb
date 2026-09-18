import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";
import type { ReactNode } from "react";

const BRAND = "#0c77bd";
const INK = "#0f172a";
const MUTED = "#475569";
const LINE = "#e2e8f0";
const BG = "#f1f5f9";

export function MarcoCorreo({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG,
          fontFamily:
            'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: "24px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: `1px solid ${LINE}`,
            borderRadius: "16px",
            maxWidth: "560px",
            padding: "32px 28px",
          }}
        >
          <Text
            style={{
              color: BRAND,
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 8px",
              textTransform: "uppercase",
            }}
          >
            CTPatrol
          </Text>
          {children}
          <Hr style={{ borderColor: LINE, borderStyle: "solid", margin: "28px 0 16px" }} />
          <Text style={{ color: MUTED, fontSize: "12px", lineHeight: "18px", margin: 0 }}>
            Inspecciones de seguridad C-TPAT. Si no esperabas este correo, ignóralo.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: INK,
        fontSize: "22px",
        fontWeight: 700,
        lineHeight: "28px",
        margin: "0 0 12px",
      }}
    >
      {children}
    </Text>
  );
}

export function Parrafo({ children }: { children: ReactNode }) {
  return (
    <Text style={{ color: INK, fontSize: "16px", lineHeight: "24px", margin: "0 0 12px" }}>
      {children}
    </Text>
  );
}

export function Boton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        className="box-border"
        style={{
          backgroundColor: BRAND,
          borderRadius: "12px",
          color: "#ffffff",
          display: "inline-block",
          fontSize: "16px",
          fontWeight: 600,
          padding: "14px 22px",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Text style={{ color: INK, fontSize: "16px", lineHeight: "24px", margin: "0 0 6px" }}>
      <span style={{ color: MUTED }}>{etiqueta}: </span>
      <strong>{valor}</strong>
    </Text>
  );
}
