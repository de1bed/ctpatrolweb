-- ============================================================================
-- CTPatrol · 0019 · Inspecciones colectivas
--
-- Una inspección colectiva la ve y la captura cualquier persona activa de la
-- empresa: uno hace la revisión externa, otro la interna. Todo es aditivo:
--
--   · Columna nueva, apagada por defecto. Las inspecciones de siempre no
--     cambian en nada.
--   · Políticas NUEVAS. En Postgres las políticas permisivas se suman con OR,
--     así que no se toca ninguna de las existentes: solo se agrega el caso
--     colectivo, siempre dentro de la misma empresa.
--   · Una fase la ocupa una sola persona a la vez, para que nadie capture
--     encima de otro.
--   · Cada foto guarda quién la tomó, para que el admin asigne responsables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Modo colectivo: se elige al crear y no cambia
-- ----------------------------------------------------------------------------

-- Con default constante Postgres no reescribe la tabla: es instantáneo.
alter table inspections
  add column if not exists is_collective boolean not null default false;

comment on column inspections.is_collective is
  'Abierta a toda la empresa. Se elige al crear; un trigger impide cambiarla.';

create or replace function bloquear_cambio_colectiva()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if new.is_collective is distinct from old.is_collective then
    raise exception 'El modo colectivo solo se elige al crear la inspección';
  end if;
  return new;
end;
$fn$;

drop trigger if exists inspections_colectiva_fija on inspections;
create trigger inspections_colectiva_fija
  before update of is_collective on inspections
  for each row execute function bloquear_cambio_colectiva();

create index if not exists inspections_colectivas_abiertas_idx
  on inspections (company_account_id, updated_at desc)
  where is_collective
    and deleted_at is null
    and status not in ('completed', 'cancelled');

-- ----------------------------------------------------------------------------
-- Quién tomó cada evidencia
--
-- El default llena la columna con quien inserta, sin cambiar el código que
-- sube. Las filas de antes quedan en null: de ellas responde el inspector
-- asignado, como hasta hoy.
-- ----------------------------------------------------------------------------

alter table inspection_media
  add column if not exists captured_by uuid
    references profiles(id) on delete set null
    default auth.uid();

-- ----------------------------------------------------------------------------
-- Permisos del caso colectivo (se suman a los existentes)
-- ----------------------------------------------------------------------------

drop policy if exists inspections_select_colectiva on inspections;
create policy inspections_select_colectiva on inspections
  for select using (
    is_collective
    and deleted_at is null
    and company_account_id = current_company_account_id()
  );

-- Igual que inspections_update_own: se edita mientras siga abierta. El WITH
-- CHECK impide sacarla de la empresa o marcarla como eliminada.
drop policy if exists inspections_update_colectiva on inspections;
create policy inspections_update_colectiva on inspections
  for update using (
    is_collective
    and deleted_at is null
    and status not in ('completed', 'cancelled')
    and company_account_id = current_company_account_id()
  )
  with check (
    is_collective
    and deleted_at is null
    and company_account_id = current_company_account_id()
  );

drop policy if exists inspection_media_colectiva on inspection_media;
create policy inspection_media_colectiva on inspection_media
  for all using (
    exists (
      select 1 from inspections i
      where i.id = inspection_media.inspection_id
        and i.is_collective
        and i.deleted_at is null
        and i.company_account_id = current_company_account_id()
    )
  )
  with check (
    company_account_id = current_company_account_id()
    and exists (
      select 1 from inspections i
      where i.id = inspection_media.inspection_id
        and i.company_account_id = inspection_media.company_account_id
    )
  );

-- Corrección de la política existente (0014). Su WITH CHECK solo pedía que la
-- fila llevara la empresa de quien sube, no que la inspección fuera de esa
-- empresa: con el id de una inspección ajena se le podía colgar un registro.
-- El USING queda idéntico; el CHECK además exige que la inspección sea de la
-- misma empresa (la subconsulta pasa por el RLS de inspections, así que
-- también exige poder verla).
drop policy if exists inspection_media_access on inspection_media;
create policy inspection_media_access on inspection_media
  for all using (
    exists (
      select 1 from inspections i
      where i.id = inspection_media.inspection_id
        and (
          (
            i.deleted_at is null
            and (
              (i.company_account_id = current_company_account_id() and is_account_admin())
              or i.assigned_to = auth.uid()
              or i.created_by = auth.uid()
              or is_super_admin()
            )
          )
          or (
            is_super_admin()
            and i.deleted_at is not null
            and i.deleted_at > now() - interval '30 days'
          )
        )
    )
  )
  with check (
    company_account_id = current_company_account_id()
    and exists (
      select 1 from inspections i
      where i.id = inspection_media.inspection_id
        and i.company_account_id = inspection_media.company_account_id
    )
  );

drop policy if exists inspection_events_select_colectiva on inspection_events;
create policy inspection_events_select_colectiva on inspection_events
  for select using (
    exists (
      select 1 from inspections i
      where i.id = inspection_events.inspection_id
        and i.is_collective
        and i.deleted_at is null
        and i.company_account_id = current_company_account_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Fase ocupada
--
-- Una fila por fase con alguien dentro. Quien la tiene manda un latido cada
-- pocos segundos; si deja de llegar (cerró la app, se quedó sin batería), a
-- los 2 minutos la fase queda libre para otro.
-- ----------------------------------------------------------------------------

create table if not exists inspection_phase_locks (
  inspection_id uuid not null references inspections(id) on delete cascade,
  step_key      text not null,
  holder_id     uuid not null references profiles(id) on delete cascade,
  taken_at      timestamptz not null default now(),
  heartbeat_at  timestamptz not null default now(),
  primary key (inspection_id, step_key)
);

alter table inspection_phase_locks enable row level security;

-- Lo ve quien puede ver la inspección (la subconsulta pasa por el RLS de
-- inspections). Escribir, solo con las funciones de abajo.
drop policy if exists inspection_phase_locks_select on inspection_phase_locks;
create policy inspection_phase_locks_select on inspection_phase_locks
  for select using (
    exists (select 1 from inspections i where i.id = inspection_phase_locks.inspection_id)
  );

/**
 * Toma la fase o renueva el latido. Si otra persona la tiene con un latido
 * reciente, no la quita: devuelve quién la tiene.
 */
create or replace function tomar_fase_inspeccion(p_id uuid, p_paso text)
returns table (ocupada boolean, holder_id uuid, holder_nombre text)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
#variable_conflict use_column
declare
  v_uid    uuid := auth.uid();
  v_holder uuid;
begin
  if v_uid is null then
    raise exception 'Sin sesión';
  end if;

  -- SECURITY DEFINER se salta RLS: el permiso se comprueba aquí, con las
  -- mismas reglas que las políticas.
  if not exists (
    select 1 from inspections i
    where i.id = p_id
      and i.deleted_at is null
      and i.status not in ('completed', 'cancelled')
      and i.company_account_id = current_company_account_id()
      and (
        i.is_collective
        or i.assigned_to = v_uid
        or i.created_by = v_uid
        or is_account_admin()
      )
  ) then
    raise exception 'No se encontró la inspección';
  end if;

  -- Una fase a la vez por persona: al entrar a otra, suelta la anterior.
  delete from inspection_phase_locks l
  where l.inspection_id = p_id
    and l.holder_id = v_uid
    and l.step_key <> p_paso;

  insert into inspection_phase_locks as l (inspection_id, step_key, holder_id)
  values (p_id, p_paso, v_uid)
  on conflict (inspection_id, step_key) do update
    set holder_id    = excluded.holder_id,
        taken_at     = case when l.holder_id = excluded.holder_id then l.taken_at else now() end,
        heartbeat_at = now()
    where l.holder_id = excluded.holder_id
       or l.heartbeat_at < now() - interval '2 minutes';

  select l.holder_id into v_holder
  from inspection_phase_locks l
  where l.inspection_id = p_id and l.step_key = p_paso;

  return query
    select v_holder is distinct from v_uid,
           v_holder,
           (select p.full_name from profiles p where p.id = v_holder);
end;
$fn$;

/** Suelta la fase indicada, o todas las de esta persona si p_paso es null. */
create or replace function soltar_fase_inspeccion(p_id uuid, p_paso text default null)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  delete from inspection_phase_locks l
  where l.inspection_id = p_id
    and l.holder_id = auth.uid()
    and (p_paso is null or l.step_key = p_paso);
$fn$;

revoke all on function tomar_fase_inspeccion(uuid, text) from public, anon;
revoke all on function soltar_fase_inspeccion(uuid, text) from public, anon;
grant execute on function tomar_fase_inspeccion(uuid, text) to authenticated;
grant execute on function soltar_fase_inspeccion(uuid, text) to authenticated;
