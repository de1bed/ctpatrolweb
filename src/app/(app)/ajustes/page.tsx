import { Building2, Mail, ShieldCheck, User } from "lucide-react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { obtenerPermisos, requerirSesion } from "@/lib/auth";

import { PanelAjustes } from "./panel";

export const metadata: Metadata = { title: "Ajustes" };

const ETIQUETA_ROL: Record<string, string> = {
  super_admin: "Administrador general",
  admin: "Administrador",
  inspector: "Inspector",
};

export default async function AjustesPage() {
  const sesion = await requerirSesion();
  const permisos = await obtenerPermisos(sesion);

  // Los permisos se muestran para que el inspector sepa qué puede hacer ANTES
  // de toparse con un botón que no está. Sin esto, "no me deja agregar el
  // conductor" es una llamada a soporte; con esto, es una mirada a esta lista.
  const listaPermisos = [
    { etiqueta: "Iniciar inspecciones por mi cuenta", activo: permisos.puedeIniciarInspeccion },
    { etiqueta: "Registrar transportistas", activo: permisos.puedeCrearCliente },
    { etiqueta: "Registrar conductores", activo: permisos.puedeCrearConductor },
    { etiqueta: "Registrar tractores", activo: permisos.puedeCrearTractor },
    { etiqueta: "Registrar contenedores", activo: permisos.puedeCrearContenedor },
    { etiqueta: "Editar documentos", activo: permisos.puedeEditarDocumentos },
    { etiqueta: "Editar datos de movimiento", activo: permisos.puedeEditarMovimiento },
  ];

  return (
    <>
      <AppHeader
        titulo="Ajustes"
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      <main className="mx-auto max-w-3xl px-gutter pb-24 pt-5 lg:pb-10">
        <div className="flex flex-col gap-5">
          {/* ── Cuenta ─────────────────────────────────────────────────── */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-muted">
              Tu cuenta
            </h2>
            <dl className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-sm text-ink-muted">Nombre</dt>
                  <dd className="font-medium text-ink">{sesion.nombre}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-sm text-ink-muted">Correo</dt>
                  <dd className="truncate font-medium text-ink">{sesion.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-sm text-ink-muted">Empresa</dt>
                  <dd className="font-medium text-ink">
                    {sesion.cuenta.name}{" "}
                    <span className="font-mono text-sm text-ink-muted">
                      ({sesion.cuenta.code})
                    </span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-sm text-ink-muted">Rol</dt>
                  <dd className="font-medium text-ink">
                    {ETIQUETA_ROL[sesion.rol] ?? sesion.rol}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          {/* ── Permisos ───────────────────────────────────────────────── */}
          {!sesion.esAdmin && (
            <Card className="p-4">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
                Lo que puedes hacer en campo
              </h2>
              <p className="mb-3 text-sm text-ink-secondary">
                Lo define tu administrador. Si necesitas algo de esta lista,
                pídeselo.
              </p>
              <ul className="flex flex-col gap-2">
                {listaPermisos.map((p) => (
                  <li key={p.etiqueta} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={
                        p.activo
                          ? "size-2 shrink-0 rounded-full bg-ok-600"
                          : "size-2 shrink-0 rounded-full bg-line-strong"
                      }
                      aria-hidden
                    />
                    <span className={p.activo ? "text-ink" : "text-ink-muted"}>
                      {p.etiqueta}
                    </span>
                    <span className="ml-auto text-xs font-medium text-ink-muted">
                      {p.activo ? "Sí" : "No"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <PanelAjustes />
        </div>
      </main>
    </>
  );
}
