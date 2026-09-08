import { BookUser, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { requerirAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";

import { TABLAS, type TipoCatalogo } from "./config";
import { EditorCatalogo, type ItemCatalogo } from "./editor";

export const metadata: Metadata = { title: "Catálogos · Admin" };

const PESTANAS: { valor: TipoCatalogo; etiqueta: string }[] = [
  { valor: "clientes", etiqueta: "Transportistas" },
  { valor: "conductores", etiqueta: "Conductores" },
  { valor: "tractores", etiqueta: "Tractores" },
  { valor: "contenedores", etiqueta: "Contenedores" },
];

const ETIQUETAS: Record<TipoCatalogo, { principal: string; secundario: string }> = {
  clientes: { principal: "Nombre", secundario: "RFC" },
  conductores: { principal: "Nombre", secundario: "Licencia" },
  tractores: { principal: "Número de unidad", secundario: "Placas" },
  contenedores: { principal: "Número", secundario: "Placas" },
};

export default async function CatalogosPage({
  searchParams,
}: PageProps<"/admin/catalogos">) {
  await requerirAdmin();
  const params = await searchParams;

  const tipo = (
    typeof params.tipo === "string" && params.tipo in TABLAS
      ? params.tipo
      : "clientes"
  ) as TipoCatalogo;
  const termino = typeof params.q === "string" ? params.q.trim() : "";

  const cfg = TABLAS[tipo];
  const supabase = await createClient();

  let consulta = supabase
    .from(cfg.tabla)
    .select(`id, ${cfg.principal}, ${cfg.secundario}, is_active, is_ephemeral, created_at`)
    .order("is_ephemeral", { ascending: false })
    .order(cfg.principal)
    .limit(200);

  if (termino) {
    const seguro = termino.replace(/[%_,()]/g, " ").trim();
    if (seguro) consulta = consulta.ilike(cfg.principal, `%${seguro}%`);
  }

  const { data } = await consulta;

  const items: ItemCatalogo[] = (
    (data ?? []) as unknown as Record<string, string | boolean | null>[]
  ).map((f) => ({
    id: String(f.id),
    principal: String(f[cfg.principal] ?? ""),
    secundario: (f[cfg.secundario] as string | null) ?? null,
    activo: Boolean(f.is_active),
    efimero: Boolean(f.is_ephemeral),
  }));

  const efimeros = items.filter((i) => i.efimero).length;

  return (
    <main className="mx-auto max-w-5xl px-gutter pb-24 pt-5 lg:pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">Catálogos</h1>
        <EditorCatalogo tipo={tipo} etiquetas={ETIQUETAS[tipo]} />
      </div>

      {/* Pestañas como enlaces: el catálogo abierto queda en la URL. */}
      <nav aria-label="Tipo de catálogo" className="mb-3">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {PESTANAS.map((p) => {
            const activo = tipo === p.valor;
            return (
              <li key={p.valor} className="shrink-0">
                <Link
                  href={`/admin/catalogos?tipo=${p.valor}`}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                    activo
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line bg-surface text-ink-secondary"
                  )}
                >
                  {p.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="GET" className="relative mb-4">
        <input type="hidden" name="tipo" value={tipo} />
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={termino}
          placeholder={`Buscar en ${PESTANAS.find((p) => p.valor === tipo)?.etiqueta.toLowerCase()}`}
          aria-label="Buscar en el catálogo"
          className="w-full rounded-xl border border-line bg-surface-raised py-3 pl-11 pr-4 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </form>

      {/* Los efímeros arriba y señalados: son los que el admin tiene que
          revisar y decidir si conserva. Enterrarlos al final del listado
          equivale a que nadie los vea nunca. */}
      {efimeros > 0 && (
        <Card className="mb-4 flex items-start gap-3 border-warn-500/40 bg-warn-50 p-4 dark:bg-warn-500/10">
          <BookUser className="mt-0.5 size-5 shrink-0 text-warn-600" aria-hidden />
          <p className="text-sm text-ink-secondary">
            <strong className="text-ink">
              {efimeros} {efimeros === 1 ? "registro capturado" : "registros capturados"} en campo
            </strong>{" "}
            que no se guardaron en el catálogo. Revísalos: si están bien
            escritos, consérvalos para que aparezcan en futuras inspecciones.
          </p>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <BookUser className="size-10 text-ink-muted/50" aria-hidden />
          <p className="font-medium text-ink">
            {termino ? "Sin resultados" : "Catálogo vacío"}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <EditorCatalogo
                tipo={tipo}
                etiquetas={ETIQUETAS[tipo]}
                item={item}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
