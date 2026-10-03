-- ============================================================================
-- CTPatrol · 0020 · Participantes de una inspección
--
-- Quién trabajó en una inspección y qué hizo. Alimenta:
--   · el aviso "Beto está en esta fase" de las colectivas,
--   · las firmas: firma cada participante, y se recomienda cerrar en el
--     teléfono de quien hizo más fases,
--   · la vista de responsables del admin.
--
-- Es SECURITY DEFINER porque un inspector no puede leer el perfil de sus
-- compañeros (profiles_select). Devuelve solo el nombre, y solo de quienes
-- trabajaron en una inspección que quien pregunta ya puede ver.
-- Solo se agrega; no cambia nada existente.
-- ============================================================================

create or replace function participantes_inspeccion(p_id uuid)
returns table (
  perfil_id   uuid,
  nombre      text,
  -- Fases distintas que guardó (incluye cerrar con firmas).
  fases       integer,
  -- Evidencia registrada a su nombre.
  fotos       integer,
  -- Fase en la que está ahora, si su latido es reciente.
  paso_actual text,
  latido      timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
#variable_conflict use_column
begin
  -- SECURITY DEFINER se salta RLS: el permiso se comprueba aquí, con las
  -- mismas reglas con que quien pregunta puede ver la inspección.
  if not exists (
    select 1 from inspections i
    where i.id = p_id
      and i.deleted_at is null
      and (
        is_super_admin()
        or (
          i.company_account_id = current_company_account_id()
          and (
            i.is_collective
            or i.assigned_to = auth.uid()
            or i.created_by = auth.uid()
            or is_account_admin()
          )
        )
      )
  ) then
    raise exception 'No se encontró la inspección';
  end if;

  return query
  with
    trabajo as (
      select e.actor_id as perfil, count(distinct e.payload ->> 'paso')::integer as fases
      from inspection_events e
      where e.inspection_id = p_id
        and e.event in ('phase_completed', 'completed')
        and e.actor_id is not null
      group by e.actor_id
    ),
    evidencia as (
      select m.captured_by as perfil, count(*)::integer as fotos
      from inspection_media m
      where m.inspection_id = p_id
        and m.captured_by is not null
      group by m.captured_by
    ),
    presentes as (
      select l.holder_id as perfil, l.step_key, l.heartbeat_at
      from inspection_phase_locks l
      where l.inspection_id = p_id
        and l.heartbeat_at > now() - interval '2 minutes'
    ),
    personas as (
      select perfil from trabajo
      union select perfil from evidencia
      union select perfil from presentes
    )
  select
    p.perfil,
    coalesce(nullif(trim(pr.full_name), ''), 'Sin nombre'),
    coalesce(t.fases, 0),
    coalesce(ev.fotos, 0),
    pre.step_key,
    pre.heartbeat_at
  from personas p
  join profiles pr on pr.id = p.perfil
  left join trabajo t on t.perfil = p.perfil
  left join evidencia ev on ev.perfil = p.perfil
  left join presentes pre on pre.perfil = p.perfil
  order by coalesce(t.fases, 0) desc, coalesce(ev.fotos, 0) desc, pr.full_name;
end;
$fn$;

revoke all on function participantes_inspeccion(uuid) from public, anon;
grant execute on function participantes_inspeccion(uuid) to authenticated;
