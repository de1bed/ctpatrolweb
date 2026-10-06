import "server-only";

import { cookies } from "next/headers";

import { COOKIE_ZONA, zonaValida } from "./zona";

/** Zona horaria de quien pide la página. Ver `lib/zona.ts`. */
export async function zonaDelUsuario(): Promise<string> {
  const almacen = await cookies();
  return zonaValida(almacen.get(COOKIE_ZONA)?.value);
}
