import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { requerirAdmin } from "@/lib/auth";
import { estadoDelMiembro } from "@/lib/equipo";
import { createClient } from "@/lib/supabase/server";

import { AltaUsuario } from "./alta-usuario";
import { datosAuthDelEquipo } from "./datos-auth";
import { TarjetaInspector, type InspectorConPermisos } from "./tarjeta";

export const metadata: Metadata = { title: "Inspectores" };
export const dynamic = "force-dynamic";

export default async function InspectoresPage() {
  const sesion = await requerirAdmin();
  const supabase = await createClient();

  // Se nombra la constraint (!inspector_permissions_profile_id_fkey) porque
  // inspector_permissions tiene DOS llaves foráneas a profiles: profile_id
  // (de quién son los permisos) y updated_by (quién los cambió). Sin
  // desambiguar, PostgREST responde PGRST201 y devuelve cero filas — la
  // pantalla salía vacía aunque los datos estuvieran ahí.
  //
  // El select va además en UNA sola cadena literal: supabase-js deduce los
  // tipos analizando ese texto, y partirlo rompe la inferencia.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at, inspector_permissions!inspector_permissions_profile_id_fkey(*)")
    .order("is_active", { ascending: false })
    .order("full_name");

  if (error) console.error("No se pudieron cargar los usuarios", error);
  const usuarios = (data ?? []) as unknown as InspectorConPermisos[];
  const auth = await datosAuthDelEquipo(usuarios.map((u) => u.id));
  const activos = usuarios.filter((u) => u.is_active).length;

  return (
    <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Usuarios de {sesion.cuenta.name}
          </h1>
          <p className="text-sm text-ink-secondary">
            {activos} en el equipo · {usuarios.length}{" "}
            {usuarios.length === 1 ? "usuario" : "usuarios"}
          </p>
        </div>
        <AltaUsuario />
      </div>

      {usuarios.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <UserPlus className="size-10 text-ink-muted/50" aria-hidden />
          <p className="font-medium text-ink">Todavía no hay usuarios</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {usuarios.map((u) => {
            const dato = auth.get(u.id);
            return (
              <li key={u.id}>
                <TarjetaInspector
                  usuario={u}
                  esYo={u.id === sesion.userId}
                  estado={estadoDelMiembro({
                    activo: u.is_active,
                    ultimaEntrada: dato?.ultimaEntrada ?? null,
                    correoEnviado: dato?.correoEnviado ?? null,
                  })}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
