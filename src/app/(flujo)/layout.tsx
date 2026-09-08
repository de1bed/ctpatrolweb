import { requerirSesion } from "@/lib/auth";

/**
 * Armazón del flujo de inspección.
 *
 * Deliberadamente SIN barra de pestañas ni riel lateral.
 *
 * Una inspección es una tarea que se empieza y se termina, no un lugar donde
 * se navega. Dejar las pestañas visibles invita a salirse a media captura —
 * y salirse a media captura, con el conductor esperando y el sello sin
 * revisar, es cómo se pierde una inspección.
 *
 * Para volver está el botón de regreso del encabezado, que es explícito y
 * deja claro que se está saliendo de algo.
 *
 * Es también la razón práctica de que este grupo exista: la barra de
 * pestañas y el botón fijo de "Continuar" viven los dos pegados abajo, y
 * juntos se encimaban.
 */
export default async function FlujoLayout({ children }: LayoutProps<"/">) {
  await requerirSesion();

  return <div className="min-h-screen-safe bg-surface-sunken">{children}</div>;
}
