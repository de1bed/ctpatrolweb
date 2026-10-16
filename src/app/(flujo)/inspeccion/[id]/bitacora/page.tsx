import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BarraReporte } from "../reporte/barra";
import { requerirSesion } from "@/lib/auth";
import {
  describir,
  leerAnalisisGuardado,
  leerCambios,
  leerResumen,
  lineasResultadoIa,
  nombrePaso,
  textoConfianza,
  textoSugerencia,
  type AnalisisLegible,
} from "@/lib/inspection/bitacora";
import { leerEventosBitacora } from "@/lib/inspection/eventos-bitacora";
import { faseIdDeClave, construirFlujo } from "@/lib/inspection/flujo";
import { leerProgreso } from "@/lib/inspection/progreso";
import { nombresDePerfiles } from "@/lib/inspecciones/colectiva";
import { createClient } from "@/lib/supabase/server";
import { formatoEnZona } from "@/lib/zona";
import { zonaDelUsuario } from "@/lib/zona-servidor";
import "../reporte/reporte.css";

export const metadata: Metadata = { title: "Bitácora" };
export const dynamic = "force-dynamic";

/**
 * Bitácora como documento, al lado del reporte y de la evidencia.
 *
 * El reporte dice cómo quedó la inspección. Este dice cómo se llegó ahí:
 * cada cambio, y en cada foto si entró la IA y qué contestó. La IA no
 * califica: queda escrito como segunda opinión.
 */
export default async function BitacoraPage({
  params,
}: PageProps<"/inspeccion/[id]/bitacora">) {
  const { id } = await params;
  const sesion = await requerirSesion();
  const supabase = await createClient();

  const { data: inspeccion } = await supabase
    .from("inspections")
    .select("id, display_id, status, transport_type, is_full, movement, progress")
    .eq("id", id)
    .maybeSingle();

  if (!inspeccion) notFound();

  const tz = await zonaDelUsuario();
  const cuando = (iso: string | null) =>
    iso ? formatoEnZona(iso, "d MMM yyyy, HH:mm:ss", tz) : "—";

  const [{ eventos, nombre }, { data: media }, { data: movimientos }] = await Promise.all([
    leerEventosBitacora(id),
    supabase
      .from("inspection_media")
      .select(
        "id, kind, phase, point_key, point_label, captured_at, captured_by, ai_analysis, ai_analyzed_at"
      )
      .eq("inspection_id", id)
      .order("phase")
      .order("sort_order"),
    supabase
      .from("ia_movimientos")
      .select("id, tipo, creditos, saldo, nota, reembolsado, created_at, actor_id, media_id")
      .eq("inspection_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const evidencia = media ?? [];

  const flujo = construirFlujo({
    tipoTransporte: inspeccion.transport_type,
    esFull: inspeccion.is_full,
    movimiento: inspeccion.movement,
    completados: leerProgreso(inspeccion.progress).completados,
  });
  const tituloDePaso = new Map(flujo.pasos.map((p) => [p.clave, p.titulo]));

  const autores = await nombresDePerfiles(
    [
      ...evidencia.map((m) => m.captured_by),
      ...(movimientos ?? []).map((m) => m.actor_id),
    ],
    sesion.companyAccountId
  );

  const fotos = evidencia.filter((m) => m.kind !== "video");
  const conIa = fotos.filter((m) => m.ai_analysis);
  const sinIa = fotos.length - conIa.length;
  const videos = evidencia.length - fotos.length;

  return (
    <>
      <BarraReporte inspeccionId={id} folio={inspeccion.display_id} />

      <article className="reporte">
        <header className="reporte__encabezado">
          <div>
            <h1>Bitácora de inspección</h1>
            <p className="reporte__folio">{inspeccion.display_id}</p>
            <p style={{ margin: "2pt 0 0", fontSize: "10pt" }}>{sesion.cuenta.name}</p>
          </div>
        </header>

        <section>
          <h2>Resumen</h2>
          <dl className="reporte__datos">
            <div>
              <dt>Movimientos</dt>
              <dd>{eventos.length}</dd>
            </div>
            <div>
              <dt>Fotos con IA</dt>
              <dd>{conIa.length}</dd>
            </div>
            <div>
              <dt>Fotos sin IA</dt>
              <dd>{sinIa}</dd>
            </div>
            <div>
              <dt>Clips</dt>
              <dd>{videos}</dd>
            </div>
            <div>
              <dt>Usos de crédito</dt>
              <dd>{(movimientos ?? []).filter((m) => m.tipo === "consumo").length}</dd>
            </div>
          </dl>
          <p style={{ margin: "8pt 0 0", fontSize: "9.5pt" }}>
            La IA es una segunda opinión. No cambia la calificación: esa la
            pone quien inspecciona y firma.
          </p>
        </section>

        <section>
          <h2>Qué pasó</h2>
          {eventos.length === 0 ? (
            <p style={{ margin: 0 }}>Todavía no hay movimientos en esta inspección.</p>
          ) : (
            <table className="reporte__tabla">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Cuándo</th>
                  <th style={{ width: "18%" }}>Quién</th>
                  <th>Qué</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => {
                  const cambios = leerCambios(e.payload);
                  const resumen = leerResumen(e.payload);
                  const lineasIa = lineasResultadoIa(e.event, e.payload);
                  return (
                    <tr key={e.id}>
                      <td>{cuando(e.occurredAt)}</td>
                      <td>{e.actor}</td>
                      <td>
                        {describir(e.event, e.payload, nombre)}
                        {resumen && (
                          <>
                            <br />
                            Puntos: {resumen}
                          </>
                        )}
                        {cambios.map((c, i) => (
                          <span key={i} style={{ display: "block" }}>
                            {c.tipo === "campo"
                              ? `${c.campo}: ${c.antes} → ${c.despues}`
                              : `${c.nombre}: ${c.antes ? `${c.antes} → ` : ""}${c.despues}${
                                  c.antesPor ? ` (antes de ${c.antesPor})` : ""
                                }${c.nota ? ` “${c.nota}”` : ""}`}
                          </span>
                        ))}
                        {lineasIa.map((linea) => (
                          <span key={linea} style={{ display: "block" }}>
                            {linea}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Fotos y la IA</h2>
          {fotos.length === 0 ? (
            <p style={{ margin: 0 }}>Esta inspección todavía no tiene fotos.</p>
          ) : (
            <table className="reporte__tabla">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Punto</th>
                  <th style={{ width: "18%" }}>Captura</th>
                  <th style={{ width: "14%" }}>IA</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {fotos.map((foto) => {
                  const analisis = leerAnalisisGuardado(foto.ai_analysis);
                  const paso =
                    tituloDePaso.get(foto.phase) ??
                    nombrePaso(foto.phase) ??
                    faseIdDeClave(foto.phase);
                  return (
                    <tr key={foto.id}>
                      <td>
                        <strong>{foto.point_label ?? foto.point_key ?? "Foto"}</strong>
                        <br />
                        {paso}
                      </td>
                      <td>
                        {cuando(foto.captured_at)}
                        {foto.captured_by && autores.get(foto.captured_by) && (
                          <>
                            <br />
                            {autores.get(foto.captured_by)}
                          </>
                        )}
                      </td>
                      <td>{analisis ? "Sí" : foto.ai_analysis ? "Sí" : "No"}</td>
                      <td>
                        {analisis ? (
                          <ResultadoFoto analisis={analisis} analizadaEn={foto.ai_analyzed_at} cuando={cuando} />
                        ) : foto.ai_analysis ? (
                          "Se usó IA, pero el resultado guardado no se pudo leer."
                        ) : (
                          "No se usó IA en esta foto."
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {videos > 0 && (
            <p style={{ margin: "8pt 0 0", fontSize: "9.5pt" }}>
              {videos === 1 ? "Hay 1 clip de video." : `Hay ${videos} clips de video.`}{" "}
              Los clips no se analizan con IA.
            </p>
          )}
        </section>

        <section>
          <h2>Créditos de IA de esta inspección</h2>
          {(movimientos ?? []).length === 0 ? (
            <p style={{ margin: 0 }}>
              No hay créditos de IA ligados a esta inspección. Las lecturas
              anteriores a este documento pueden no traer el texto que devolvió
              la IA; a partir de ahora queda en «Qué pasó».
            </p>
          ) : (
            <table className="reporte__tabla">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Cuándo</th>
                  <th style={{ width: "18%" }}>Quién</th>
                  <th>Movimiento</th>
                </tr>
              </thead>
              <tbody>
                {(movimientos ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{cuando(m.created_at)}</td>
                    <td>{(m.actor_id && autores.get(m.actor_id)) || "—"}</td>
                    <td>
                      {m.nota || m.tipo}
                      {m.tipo === "consumo" && m.reembolsado
                        ? " · se devolvió el crédito porque la IA falló"
                        : ` · ${m.creditos > 0 ? "+" : ""}${m.creditos} crédito · saldo ${m.saldo}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="reporte__pie">
          Documento generado por CTPatrol el{" "}
          {formatoEnZona(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", tz)}. Folio{" "}
          {inspeccion.display_id}.
        </footer>
      </article>
    </>
  );
}

function ResultadoFoto({
  analisis,
  analizadaEn,
  cuando,
}: {
  analisis: AnalisisLegible;
  analizadaEn: string | null;
  cuando: (iso: string | null) => string;
}) {
  const sugerencia = textoSugerencia(analisis.sugerencia) ?? analisis.sugerencia;
  const confianza = textoConfianza(analisis.confianza);
  return (
    <>
      <strong>{sugerencia}</strong>
      <br />
      {analisis.observacion}
      {analisis.indicios.length > 0 && (
        <>
          <br />
          Indicios: {analisis.indicios.join("; ")}
        </>
      )}
      <br />
      Foto {analisis.calidad}
      {analisis.problemaCalidad ? `. ${analisis.problemaCalidad}` : ""}
      {confianza ? ` · confianza ${confianza}` : ""}
      {analizadaEn ? ` · ${cuando(analizadaEn)}` : ""}
    </>
  );
}
