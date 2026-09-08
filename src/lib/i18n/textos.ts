import type { Idioma } from "./idioma";

/**
 * Diccionario de la interfaz.
 *
 * El español es la fuente: es el idioma en el que se pensó la app y en el
 * que trabajan los inspectores. El inglés está para las empresas del lado
 * estadounidense y para auditores de CBP.
 *
 * NO se traduce el contenido C-TPAT (nombres de puntos, pistas, guías). Ese
 * material está escrito por quien sabe del oficio y una traducción automática
 * podría cambiar el sentido de una instrucción de inspección. Cuando haga
 * falta en inglés, tiene que traducirlo alguien que conozca la norma.
 */

export type Textos = typeof ES;

const ES = {
  // ── Comunes ───────────────────────────────────────────────────────────
  guardar: "Guardar",
  cancelar: "Cancelar",
  continuar: "Continuar",
  volver: "Volver",
  buscar: "Buscar",
  cerrar: "Cerrar",
  reintentar: "Reintentar",
  cargando: "Cargando…",
  guardando: "Guardando…",
  sinResultados: "Sin resultados",

  // ── Navegación ────────────────────────────────────────────────────────
  inicio: "Inicio",
  inspecciones: "Inspecciones",
  expedientes: "Expedientes",
  admin: "Admin",
  ajustes: "Ajustes",
  cerrarSesion: "Cerrar sesión",

  // ── Sesión ────────────────────────────────────────────────────────────
  entrar: "Entrar",
  correo: "Correo",
  contrasena: "Contraseña",
  credencialesInvalidas: "Correo o contraseña incorrectos.",
  problemasParaEntrar: "¿Problemas para entrar? Escribe a tu administrador.",

  // ── Inicio ────────────────────────────────────────────────────────────
  nuevaInspeccion: "Nueva inspección",
  pendientes: "Pendientes",
  nadaPendiente: "Nada pendiente",
  nadaPendienteDetalle:
    "Cuando tengas inspecciones asignadas o a medias, aparecen aquí.",

  // ── Inspección ────────────────────────────────────────────────────────
  paso: "Paso",
  de: "de",
  pasos: "pasos",
  comenzarInspeccion: "Comenzar inspección",
  guardarYContinuar: "Guardar y continuar",
  pausarInspeccion: "Pausar inspección",
  reanudarInspeccion: "Reanudar inspección",
  verEvidencia: "Ver evidencia",
  verReporte: "Ver reporte",
  verGuia: "Ver guía",
  noAplica: "No aplica",
  siAplica: "Sí aplica",
  bueno: "Bueno",
  regular: "Regular",
  malo: "Malo",

  // ── Estados ───────────────────────────────────────────────────────────
  borrador: "Borrador",
  asignada: "Asignada",
  enCurso: "En curso",
  pausada: "Pausada",
  completada: "Completada",
  cancelada: "Cancelada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",

  // ── Evidencia ─────────────────────────────────────────────────────────
  subiendoEvidencia: "Subiendo evidencia",
  sinSubir: "sin subir",
  seEnviaranSolas: "se enviarán solas",
  tomarFoto: "Tomar foto",
  volverATomar: "Volver a tomar",
  analizarConIA: "Analizar con IA",
  analizando: "Analizando…",
} as const;

const EN: Record<keyof typeof ES, string> = {
  guardar: "Save",
  cancelar: "Cancel",
  continuar: "Continue",
  volver: "Back",
  buscar: "Search",
  cerrar: "Close",
  reintentar: "Retry",
  cargando: "Loading…",
  guardando: "Saving…",
  sinResultados: "No results",

  inicio: "Home",
  inspecciones: "Inspections",
  expedientes: "Records",
  admin: "Admin",
  ajustes: "Settings",
  cerrarSesion: "Sign out",

  entrar: "Sign in",
  correo: "Email",
  contrasena: "Password",
  credencialesInvalidas: "Incorrect email or password.",
  problemasParaEntrar: "Trouble signing in? Contact your administrator.",

  nuevaInspeccion: "New inspection",
  pendientes: "Pending",
  nadaPendiente: "Nothing pending",
  nadaPendienteDetalle:
    "Inspections assigned to you, or left unfinished, show up here.",

  paso: "Step",
  de: "of",
  pasos: "steps",
  comenzarInspeccion: "Start inspection",
  guardarYContinuar: "Save and continue",
  pausarInspeccion: "Pause inspection",
  reanudarInspeccion: "Resume inspection",
  verEvidencia: "View evidence",
  verReporte: "View report",
  verGuia: "View guide",
  noAplica: "Not applicable",
  siAplica: "Applicable",
  bueno: "Good",
  regular: "Fair",
  malo: "Poor",

  borrador: "Draft",
  asignada: "Assigned",
  enCurso: "In progress",
  pausada: "Paused",
  completada: "Completed",
  cancelada: "Cancelled",
  aprobada: "Passed",
  rechazada: "Failed",

  subiendoEvidencia: "Uploading evidence",
  sinSubir: "not uploaded",
  seEnviaranSolas: "will upload automatically",
  tomarFoto: "Take photo",
  volverATomar: "Retake",
  analizarConIA: "Analyze with AI",
  analizando: "Analyzing…",
};

export const DICCIONARIOS: Record<Idioma, Textos> = {
  es: ES,
  en: EN as Textos,
};

export function textos(idioma: Idioma): Textos {
  return DICCIONARIOS[idioma] ?? ES;
}
