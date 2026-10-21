import type { Metadata } from "next";
import Link from "next/link";

import { MarcoAuth } from "@/components/auth/marco";

export const metadata: Metadata = { title: "Acceso por invitación" };

export default function RegistroPage() {
  return (
    <MarcoAuth
      titulo="Acceso por invitación"
      subtitulo="El registro público no está disponible. El acceso a CTPatrol es solo por invitación de tu empresa."
      pie={<PieRegistro />}
    >
      <div className="rounded-xl border border-line bg-surface-secondary p-5 text-center">
        <p className="text-sm text-ink-secondary">
          Si tu empresa usa CTPatrol, contacta a tu administrador para que te
          invite al sistema.
        </p>
        <p className="mt-3 text-sm text-ink-secondary">
          Si representas a una empresa interesada en CTPatrol, contacta a{" "}
          <a
            href="mailto:soporte@vortexlabai.com"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            soporte@vortexlabai.com
          </a>
          .
        </p>
      </div>
    </MarcoAuth>
  );
}

function PieRegistro() {
  return (
    <div className="space-y-3">
      <p>
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Entrar
        </Link>
      </p>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-ink-muted">
        <Link href="/privacidad" className="hover:text-brand-600">
          Aviso de privacidad
        </Link>
        <Link href="/terminos" className="hover:text-brand-600">
          Términos
        </Link>
        <Link href="/cookies" className="hover:text-brand-600">
          Cookies
        </Link>
      </nav>
    </div>
  );
}
