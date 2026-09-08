import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";

import { InspectionCard } from "@/components/inspection/inspection-card";
import { AppHeader } from "@/components/shell/app-header";
import { Card } from "@/components/ui/card";
import { requerirSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inspecciones" };

/**
 * Inspecciones abiertas.
 *
 * Todo lo que todavía requiere trabajo: asignadas, en curso y pausadas.
 * Lo terminado vive en Expedientes, que es una vista distinta con otras
 * necesidades (buscar, consultar el reporte) y no debe mezclarse aquí.
 */
export default async function InspeccionesPage() {
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { data } = await supabase
    .from("inspections")
    .select("id, display_id, status, customer_name, tractor_number, updated_at")
    .in("status", ["draft", "assigned", "in_progress", "paused"])
    .order("updated_at", { ascending: false })
    .limit(100);

  const inspecciones = data ?? [];

  return (
    <>
      <AppHeader
        titulo="Inspecciones"
        nombreUsuario={sesion.nombre}
        nombreCuenta={sesion.cuenta.name}
      />

      <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
        {inspecciones.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ClipboardList className="size-10 text-ink-muted/50" aria-hidden />
            <p className="font-medium text-ink">Sin inspecciones abiertas</p>
            <p className="max-w-xs text-sm text-ink-secondary">
              Aquí aparecen las asignadas, las que dejaste a medias y las
              pausadas.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {inspecciones.map((i) => (
              <li key={i.id}>
                <InspectionCard inspeccion={i} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
