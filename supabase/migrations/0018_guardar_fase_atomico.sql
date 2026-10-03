-- ============================================================================
-- CTPatrol · 0018 · Guardado atómico de una fase
--
-- Antes, guardar una fase leía data/progress/timings completos, los
-- modificaba en el servidor de Next y los escribía de vuelta. Con dos
-- personas guardando la misma inspección al mismo tiempo, la segunda
-- escritura borraba la fase de la primera sin ningún error.
--
-- Esta función fusiona SOLO la fase dentro de un UPDATE. Postgres bloquea la
-- fila y, si otra escritura llegó antes, reevalúa el SET sobre la versión ya
-- actualizada: ninguna fase se pierde.
--
-- Es SECURITY INVOKER: corre con los permisos de quien guarda, así que RLS
-- decide igual que con el UPDATE directo de antes. Solo se agrega; no cambia
-- nada existente.
-- ============================================================================

create or replace function guardar_fase_inspeccion(
  p_id uuid,
  p_paso text,
  p_datos jsonb,
  p_segundos integer
)
returns table (datos jsonb, progreso jsonb, tiempos jsonb)
language sql
security invoker
set search_path = public, pg_temp
as $fn$
  update inspections i
  set
    data =
      (case when jsonb_typeof(i.data) = 'object' then i.data else '{}'::jsonb end)
      || jsonb_build_object(p_paso, p_datos),

    -- Se conservan otras llaves de progress; completados queda sin duplicados
    -- y en el orden en que se terminaron, como lo dejaba el código anterior.
    progress =
      (case when jsonb_typeof(i.progress) = 'object' then i.progress else '{}'::jsonb end)
      || jsonb_build_object(
        'completados',
        (
          select coalesce(jsonb_agg(c.clave order by c.orden), '[]'::jsonb)
          from (
            select t.clave, min(t.orden) as orden
            from (
              select e.clave, e.orden
              from jsonb_array_elements_text(
                case
                  when jsonb_typeof(i.progress -> 'completados') = 'array'
                    then i.progress -> 'completados'
                  else '[]'::jsonb
                end
              ) with ordinality as e(clave, orden)
              union all
              select p_paso, 9223372036854775807
            ) t
            group by t.clave
          ) c
        ),
        'ultimoPaso', p_paso
      ),

    -- Se acumula, con tope de 2 horas por visita, igual que antes.
    timings =
      (case when jsonb_typeof(i.timings) = 'object' then i.timings else '{}'::jsonb end)
      || jsonb_build_object(
        p_paso,
        (case
          when jsonb_typeof(i.timings -> p_paso) = 'number'
            then (i.timings ->> p_paso)::numeric
          else 0
        end) + greatest(0, least(coalesce(p_segundos, 0), 7200))
      )
  where i.id = p_id
    and i.status not in ('completed', 'cancelled')
  returning i.data, i.progress, i.timings;
$fn$;

revoke all on function guardar_fase_inspeccion(uuid, text, jsonb, integer) from public, anon;
grant execute on function guardar_fase_inspeccion(uuid, text, jsonb, integer) to authenticated;
