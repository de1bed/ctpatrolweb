import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import type { Database } from "./supabase/database.types";

export type Rol = Database["public"]["Enums"]["user_role"];

export type Sesion = {
  userId: string;
  email: string;
  nombre: string;
  rol: Rol;
  companyAccountId: string;
  cuenta: { id: string; code: string; name: string; logoUrl: string | null };
  esAdmin: boolean;
};

/**
 * Sesión del usuario actual, o null si no hay.
 *
 * El middleware ya bloqueó las rutas privadas, así que llegar aquí sin
 * sesión solo pasa en rutas públicas. Aun así se devuelve null en vez de
 * asumir: un layout que confía en que "alguien más ya validó" es
 * exactamente como se cuela un acceso no autorizado.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!user.email_confirmed_at) return null;

  // OJO: el select va en UNA sola cadena literal, sin concatenar.
  // supabase-js deduce los tipos del resultado analizando este texto en
  // tiempo de compilación. Si se parte con `+`, deja de ser un literal, la
  // inferencia se cae y `perfil` termina como un tipo de error inservible.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, company_account_id, company_accounts(id, code, name, logo_url)")
    .eq("id", user.id)
    .single();

  // Sin perfil o desactivado, no hay sesión válida. Pasa cuando un admin
  // da de baja a alguien que tenía la app abierta.
  if (!perfil || !perfil.is_active) return null;

  const cuenta = perfil.company_accounts as unknown as {
    id: string;
    code: string;
    name: string;
    logo_url: string | null;
  } | null;

  if (!cuenta) return null;

  return {
    userId: perfil.id,
    email: perfil.email,
    nombre: perfil.full_name || perfil.email,
    rol: perfil.role,
    companyAccountId: perfil.company_account_id,
    cuenta: {
      id: cuenta.id,
      code: cuenta.code,
      name: cuenta.name,
      logoUrl: cuenta.logo_url,
    },
    esAdmin: perfil.role === "admin" || perfil.role === "super_admin",
  };
}

/** Exige sesión. Manda al login si no hay. */
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/** Exige rol administrativo. Regresa al inicio operativo si no lo tiene. */
export async function requerirAdmin(): Promise<Sesion> {
  const sesion = await requerirSesion();
  if (!sesion.esAdmin) redirect("/");
  return sesion;
}

/**
 * Permisos de campo del inspector.
 *
 * Sin fila en la tabla = todo denegado. Es la postura correcta: si algo
 * falla al leer permisos, que el resultado sea "no puedes", no "puedes todo".
 */
export type PermisosInspector = {
  puedeIniciarInspeccion: boolean;
  puedeCrearCliente: boolean;
  puedeCrearConductor: boolean;
  puedeCrearTractor: boolean;
  puedeCrearContenedor: boolean;
  puedeEditarDocumentos: boolean;
  puedeEditarMovimiento: boolean;
};

const NINGUNO: PermisosInspector = {
  puedeIniciarInspeccion: false,
  puedeCrearCliente: false,
  puedeCrearConductor: false,
  puedeCrearTractor: false,
  puedeCrearContenedor: false,
  puedeEditarDocumentos: false,
  puedeEditarMovimiento: false,
};

export async function obtenerPermisos(
  sesion: Sesion
): Promise<PermisosInspector> {
  // Un admin no está limitado por los permisos de campo.
  if (sesion.esAdmin) {
    return {
      puedeIniciarInspeccion: true,
      puedeCrearCliente: true,
      puedeCrearConductor: true,
      puedeCrearTractor: true,
      puedeCrearContenedor: true,
      puedeEditarDocumentos: true,
      puedeEditarMovimiento: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("inspector_permissions")
    .select("*")
    .eq("profile_id", sesion.userId)
    .maybeSingle();

  if (!data) return NINGUNO;

  return {
    puedeIniciarInspeccion: data.can_start_new_inspection,
    puedeCrearCliente: data.can_create_customer,
    puedeCrearConductor: data.can_create_driver,
    puedeCrearTractor: data.can_create_tractor,
    puedeCrearContenedor: data.can_create_container,
    puedeEditarDocumentos: data.can_edit_documents,
    puedeEditarMovimiento: data.can_edit_movement_data,
  };
}
