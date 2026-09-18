"use client";

import { HardDrive, Languages, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { cerrarSesion } from "@/app/login/actions";
import { CambiarContrasena } from "./cambiar-password";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { espacioDisponible, pendientesDeSubida } from "@/lib/media/almacen";
import {
  aplicarIdioma,
  leerIdioma,
  leerIdiomaServidor,
  suscribirIdioma,
  type Idioma,
} from "@/lib/i18n/idioma";
import {
  aplicarTema,
  leerTema,
  leerTemaServidor,
  suscribirTema,
  type Tema,
} from "@/lib/tema";

/**
 * Ajustes del dispositivo.
 *
 * Va en cliente porque toca cosas que solo existen en el navegador: el tema
 * guardado y el espacio de almacenamiento local.
 */
export function PanelAjustes() {
  // El tema vive fuera de React (localStorage + atributo del <html>), así que
  // se lee como store externo en vez de copiarlo a estado con un efecto.
  const tema = useSyncExternalStore(suscribirTema, leerTema, leerTemaServidor);
  const idioma = useSyncExternalStore(
    suscribirIdioma,
    leerIdioma,
    leerIdiomaServidor
  );

  const [almacen, setAlmacen] = useState<{
    usadoMb: number;
    disponibleMb: number;
    pendientes: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([espacioDisponible(), pendientesDeSubida()]).then(
      ([espacio, cola]) => {
        if (espacio) setAlmacen({ ...espacio, pendientes: cola.length });
      }
    );
  }, []);

  const opciones: { valor: Tema; etiqueta: string; icono: typeof Sun }[] = [
    { valor: "light", etiqueta: "Claro", icono: Sun },
    { valor: "dark", etiqueta: "Oscuro", icono: Moon },
    { valor: "sistema", etiqueta: "Sistema", icono: Monitor },
  ];

  return (
    <>
      {/* ── Apariencia ───────────────────────────────────────────────── */}
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
          Apariencia
        </h2>
        <p className="mb-3 text-sm text-ink-secondary">
          El modo oscuro ayuda en inspecciones nocturnas: una pantalla blanca a
          las 3 a.m. deslumbra y cuesta recuperar la vista.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {opciones.map((o) => {
            const Icono = o.icono;
            const activo = tema === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => aplicarTema(o.valor)}
                aria-pressed={activo}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-colors",
                  activo
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "border-line bg-surface text-ink-secondary"
                )}
              >
                <Icono className="size-5" aria-hidden />
                <span className="text-sm font-medium">{o.etiqueta}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Idioma ───────────────────────────────────────────────────── */}
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
          Idioma · Language
        </h2>
        <p className="mb-3 text-sm text-ink-secondary">
          Cambia la interfaz. El contenido C-TPAT —nombres de puntos y guías de
          inspección— se mantiene en español: traducirlo automáticamente
          podría alterar el sentido de una instrucción.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { valor: "es" as Idioma, etiqueta: "Español" },
            { valor: "en" as Idioma, etiqueta: "English" },
          ]).map((o) => {
            const activo = idioma === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => aplicarIdioma(o.valor)}
                aria-pressed={activo}
                className={cn(
                  "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 transition-colors",
                  activo
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "border-line bg-surface text-ink-secondary"
                )}
              >
                <Languages className="size-5" aria-hidden />
                <span className="font-medium">{o.etiqueta}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Almacenamiento ───────────────────────────────────────────── */}
      {almacen && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-muted">
            Almacenamiento del dispositivo
          </h2>
          <div className="flex items-start gap-3">
            <HardDrive className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="text-ink">
                {almacen.usadoMb} MB usados · {almacen.disponibleMb} MB libres
              </p>
              <p className="mt-1 text-ink-secondary">
                {almacen.pendientes === 0
                  ? "Toda la evidencia está sincronizada."
                  : `${almacen.pendientes} ${
                      almacen.pendientes === 1 ? "foto pendiente" : "fotos pendientes"
                    } de subir. Se envían solas al recuperar señal.`}
              </p>
            </div>
          </div>
        </Card>
      )}

      <CambiarContrasena />

      {/* ── Sesión ───────────────────────────────────────────────────── */}
      <Card className="p-4">
        <form action={cerrarSesion}>
          <Button type="submit" variant="secondary" block className="text-danger-600">
            <LogOut className="size-5" aria-hidden />
            Cerrar sesión
          </Button>
        </form>
        <p className="mt-3 text-center text-xs text-ink-muted">
          La evidencia sin subir se queda en este dispositivo hasta que
          sincronice. Evita cerrar sesión con fotos pendientes.
        </p>
      </Card>
    </>
  );
}
