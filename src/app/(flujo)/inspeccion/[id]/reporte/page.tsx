import { format } from "date-fns";
import { es } from "date-fns/locale";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requerirSesion } from "@/lib/auth";
import { construirFlujo } from "@/lib/inspection/flujo";
import { leerProgreso } from "@/lib/inspection/progreso";
import { calcularResultado } from "@/lib/inspection/resultado";
import { PUNTOS_POR_GRUPO } from "@/lib/inspection/puntos";
import { capacidadesDe } from "@/lib/inspection/transporte";
import { createClient } from "@/lib/supabase/server";

import { BarraReporte } from "./barra";
import "./reporte.css";

export const metadata: Metadata = { title: "Reporte" };

/** Vigencia de los enlaces de foto. Suficiente para imprimir, poco para filtrar. */
const MINUTOS_ENLACE = 30;

type PuntoGuardado = {
  calificacion?: string;
  nota?: string;
  noAplica?: boolean;
};

/**
 * Reporte de inspección, listo para imprimir.
 *
 * Se genera en el servidor como HTML y se imprime desde el navegador. Eso
 * sustituye a PDFShift, el servicio de pago que usaba el sistema anterior:
 * el navegador ya sabe hacer PDF, y hacerlo aquí evita mandar la evidencia
 * a un tercero además de ahorrar la suscripción.
 */
export default async function ReportePage({
  params,
}: PageProps<"/inspeccion/[id]/reporte">) {
  const { id } = await params;
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!inspeccion) notFound();

  const { data: evidencia } = await supabase
    .from("inspection_media")
    .select("id, phase, point_key, point_label, storage_path, captured_at, latitude, longitude")
    .eq("inspection_id", id)
    .not("storage_path", "is", null)
    .order("phase")
    .order("sort_order");

  const fotos = evidencia ?? [];

  // Enlaces firmados de vida corta. El bucket es privado: la evidencia no
  // debe quedar accesible con una URL permanente que alguien pueda reenviar.
  const rutas = fotos.map((f) => f.storage_path!).filter(Boolean);
  const { data: firmados } = rutas.length
    ? await supabase.storage
        .from("inspection-media")
        .createSignedUrls(rutas, MINUTOS_ENLACE * 60)
    : { data: [] };

  const urlPorRuta = new Map<string, string>();
  for (const f of firmados ?? []) {
    if (f.path && f.signedUrl) urlPorRuta.set(f.path, f.signedUrl);
  }

  const datos = (inspeccion.data ?? {}) as Record<string, Record<string, unknown>>;
  const progreso = leerProgreso(inspeccion.progress);
  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    completados: progreso.completados,
  });

  const resultado = calcularResultado(inspeccion.data);
  const capacidades = capacidadesDe(inspeccion.transport_type);

  const fechaTexto = (iso: string | null) =>
    iso ? format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es }) : "—";

  // Fases visuales que tienen puntos capturados.
  const fasesVisuales = flujo.pasos.filter((p) => p.fase.puntos);

  const firmas = datos["firmas"] as
    | {
        inspector?: { nombre?: string; firma?: string };
        conductor?: { nombre?: string; firma?: string };
      }
    | undefined;

  return (
    <>
      <BarraReporte inspeccionId={id} folio={inspeccion.display_id} />

      <article className="reporte">
        {/* ── Encabezado ──────────────────────────────────────────────── */}
        <header className="reporte__encabezado">
          <div>
            <h1>Inspección de seguridad C-TPAT</h1>
            <p className="reporte__folio">{inspeccion.display_id}</p>
            <p style={{ margin: "2pt 0 0", fontSize: "10pt" }}>
              {sesion.cuenta.name}
            </p>
          </div>

          {inspeccion.status === "completed" && (
            <span
              className={`reporte__resultado reporte__resultado--${
                resultado.aprobada ? "aprobada" : "rechazada"
              }`}
            >
              {resultado.aprobada ? "Aprobada" : "Rechazada"}
            </span>
          )}
        </header>

        {/* ── Datos generales ─────────────────────────────────────────── */}
        <section>
          <h2>Datos de la inspección</h2>
          <dl className="reporte__datos">
            <div>
              <dt>Transportista</dt>
              <dd>{inspeccion.customer_name ?? "—"}</dd>
            </div>
            <div>
              <dt>Conductor</dt>
              <dd>{inspeccion.driver_name ?? "—"}</dd>
            </div>
            <div>
              <dt>Tractor</dt>
              <dd>{inspeccion.tractor_number ?? "—"}</dd>
            </div>
            <div>
              <dt>Tipo de transporte</dt>
              <dd>
                {capacidades?.nombre ?? "—"}
                {inspeccion.is_full && capacidades?.admiteFull ? " · Full" : ""}
              </dd>
            </div>
            <div>
              <dt>Movimiento</dt>
              <dd>{inspeccion.movement ?? "—"}</dd>
            </div>
            <div>
              <dt>Estado entrada / salida</dt>
              <dd>
                {inspeccion.entry_status ?? "—"} / {inspeccion.exit_status ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Entrada de la unidad</dt>
              <dd>{fechaTexto(inspeccion.entered_at)}</dd>
            </div>
            <div>
              <dt>Inicio / término</dt>
              <dd>
                {fechaTexto(inspeccion.started_at)} — {fechaTexto(inspeccion.completed_at)}
              </dd>
            </div>
            <div>
              <dt>Ubicación GPS</dt>
              <dd>
                {inspeccion.location_captured && inspeccion.latitude != null
                  ? `${inspeccion.latitude.toFixed(6)}, ${inspeccion.longitude?.toFixed(6)}`
                  : "No capturada"}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── Resumen de hallazgos ────────────────────────────────────── */}
        <section>
          <h2>Resumen</h2>
          <p style={{ margin: 0 }}>
            Se revisaron {contarPuntos(datos, fasesVisuales)} puntos de inspección
            con {fotos.length} evidencias fotográficas.{" "}
            {resultado.hallazgos === 0 ? (
              <>No se registraron hallazgos.</>
            ) : (
              <>
                Se registraron <strong>{resultado.hallazgos}</strong>{" "}
                {resultado.hallazgos === 1 ? "hallazgo" : "hallazgos"}
                {resultado.criticos > 0 && (
                  <>
                    , de los cuales <strong>{resultado.criticos}</strong>{" "}
                    {resultado.criticos === 1 ? "es crítico" : "son críticos"}
                  </>
                )}
                .
              </>
            )}
          </p>
        </section>

        {/* ── Detalle por fase visual ─────────────────────────────────── */}
        {fasesVisuales.map((paso) => {
          const puntosCatalogo = PUNTOS_POR_GRUPO[paso.fase.puntos!];
          const guardados = (datos[paso.clave]?.puntos ?? {}) as Record<
            string,
            PuntoGuardado
          >;
          if (Object.keys(guardados).length === 0) return null;

          return (
            <section key={paso.clave}>
              <h2>{paso.titulo}</h2>
              <table className="reporte__tabla">
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th style={{ width: "35%" }}>Punto</th>
                    <th style={{ width: "15%" }}>Resultado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {puntosCatalogo.map((punto, i) => {
                    const g = guardados[punto.clave];
                    if (!g) return null;
                    const calif = g.noAplica ? "No aplica" : (g.calificacion ?? "—");
                    return (
                      <tr key={punto.clave}>
                        <td>{i + 1}</td>
                        <td>{punto.nombre}</td>
                        <td
                          className={`reporte__calif reporte__calif--${
                            g.noAplica ? "" : g.calificacion
                          }`}
                        >
                          {calif.charAt(0).toUpperCase() + calif.slice(1)}
                        </td>
                        <td>{g.nota || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}

        {/* ── Evidencia fotográfica ───────────────────────────────────── */}
        {fotos.length > 0 && (
          <section>
            <h2>Evidencia fotográfica</h2>
            <div className="reporte__fotos">
              {fotos.map((foto) => {
                const url = foto.storage_path
                  ? urlPorRuta.get(foto.storage_path)
                  : null;
                if (!url) return null;

                return (
                  <div className="reporte__foto" key={foto.id}>
                    <figure>
                      {/*
                        Carga ansiosa a propósito, NO perezosa.

                        Una imagen con loading="lazy" que nunca entró al
                        viewport puede no renderizarse al imprimir, y este
                        documento se imprime y se archiva como evidencia. Un
                        reporte con huecos donde debía ir una foto no sirve
                        ante una auditoría.

                        Cuesta cargar las 41 de golpe; es el precio correcto
                        por un documento que siempre sale completo.
                      */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Evidencia de ${foto.point_label ?? foto.point_key ?? "punto"}`}
                        loading="eager"
                      />
                      <figcaption>
                        <strong>{foto.point_label ?? foto.point_key}</strong>
                        <br />
                        {format(new Date(foto.captured_at), "dd/MM/yyyy HH:mm:ss")}
                        {foto.latitude != null && foto.longitude != null && (
                          <>
                            <br />
                            {foto.latitude.toFixed(5)}, {foto.longitude.toFixed(5)}
                          </>
                        )}
                      </figcaption>
                    </figure>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Firmas ──────────────────────────────────────────────────── */}
        {firmas?.inspector?.firma && (
          <section>
            <h2>Firmas</h2>
            <div className="reporte__firmas">
              <div className="reporte__firma">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firmas.inspector.firma} alt="Firma del inspector" />
                <p>
                  <strong>{firmas.inspector.nombre}</strong>
                  <br />
                  Inspector
                </p>
              </div>
              {firmas.conductor?.firma && (
                <div className="reporte__firma">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firmas.conductor.firma} alt="Firma del conductor" />
                  <p>
                    <strong>{firmas.conductor.nombre}</strong>
                    <br />
                    Conductor
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="reporte__pie">
          Documento generado por CTPatrol el{" "}
          {format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}.
          Folio {inspeccion.display_id}. Las fotografías incluyen fecha, hora y
          coordenadas impresas en la propia imagen.
        </footer>
      </article>
    </>
  );
}

function contarPuntos(
  datos: Record<string, Record<string, unknown>>,
  pasos: { clave: string }[]
): number {
  let n = 0;
  for (const paso of pasos) {
    const puntos = datos[paso.clave]?.puntos;
    if (puntos && typeof puntos === "object") {
      n += Object.keys(puntos).length;
    }
  }
  return n;
}
