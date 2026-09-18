/** Ruta interna segura para redirecciones post-login. */
export function rutaInternaSegura(valor: string | undefined, fallback = "/"): string {
  if (!valor) return fallback;
  // Un `volver` con http:// externo convertiría el login en trampolín de phishing.
  if (valor.startsWith("/") && !valor.startsWith("//")) return valor;
  return fallback;
}

export function coincideRuta(pathname: string, ruta: string): boolean {
  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}
