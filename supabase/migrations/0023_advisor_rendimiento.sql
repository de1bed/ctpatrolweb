-- ============================================================================
-- CTPatrol · 0023 · Avisos de rendimiento del advisor de Supabase
--
-- P6: dos familias que se pueden corregir en una migración, sin cambiar
-- semántica de RLS:
--
--   1) auth_rls_initplan — `auth.uid()` (y `current_setting()`) se reevalúan
--      por fila. Envolverlos en `(select …)` los convierte en InitPlan.
--      https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
--   2) unindexed_foreign_keys — FKs sin índice que cubra la columna.
--      `create index if not exists` para no fallar si ya se creó a mano.
--
-- No se tocan:
--   - unused_index: son índices de búsqueda/filtros; no haberlos usado en
--     este entorno no los hace prescindibles.
--   - multiple_permissive_policies: políticas admin + inspector/propia
--     son intencionales; fusionarlas mezclaría privilegios.
--   - leaked-password protection: ajuste del dashboard de Auth, no SQL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS: (select auth.uid()) / (select current_setting(...))
-- ----------------------------------------------------------------------------

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (
    id = (select auth.uid())
    or (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = current_user_role()
    and company_account_id = current_company_account_id()
  );

drop policy if exists inspector_permissions_select_own on inspector_permissions;
create policy inspector_permissions_select_own on inspector_permissions
  for select using (profile_id = (select auth.uid()));

drop policy if exists inspections_select on inspections;
create policy inspections_select on inspections
  for select using (
    (
      deleted_at is null
      and (
        (company_account_id = current_company_account_id() and is_account_admin())
        or assigned_to = (select auth.uid())
        or created_by = (select auth.uid())
        or is_super_admin()
      )
    )
    or (
      is_super_admin()
      and deleted_at is not null
      and deleted_at > now() - interval '30 days'
    )
  );

drop policy if exists inspections_insert on inspections;
create policy inspections_insert on inspections
  for insert with check (
    company_account_id = current_company_account_id()
    and (
      is_account_admin()
      or assigned_to = (select auth.uid())
      or created_by = (select auth.uid())
    )
  );

drop policy if exists inspections_update_own on inspections;
create policy inspections_update_own on inspections
  for update using (
    (assigned_to = (select auth.uid()) or created_by = (select auth.uid()))
    and status not in ('completed', 'cancelled')
  )
  with check (company_account_id = current_company_account_id());

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
              or i.assigned_to = (select auth.uid())
              or i.created_by = (select auth.uid())
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

drop policy if exists inspection_events_select on inspection_events;
create policy inspection_events_select on inspection_events
  for select using (
    exists (
      select 1 from inspections i
      where i.id = inspection_events.inspection_id
        and (
          (i.company_account_id = current_company_account_id() and is_account_admin())
          or i.assigned_to = (select auth.uid())
          or i.created_by = (select auth.uid())
          or is_super_admin()
        )
    )
  );

drop policy if exists ia_movimientos_insert_consumo on ia_movimientos;
create policy ia_movimientos_insert_consumo on ia_movimientos
  for insert with check (
    (select current_setting('ctpatrol.consumo_ia', true)) = '1'
    and tipo = 'consumo'
    and creditos = -1
    and company_account_id = current_company_account_id()
    and actor_id = (select auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 2. Índices que cubren FKs sin índice
-- ----------------------------------------------------------------------------

create index if not exists containers_created_by_idx
  on public.containers (created_by);

create index if not exists customers_created_by_idx
  on public.customers (created_by);

create index if not exists drivers_created_by_idx
  on public.drivers (created_by);

create index if not exists tractors_created_by_idx
  on public.tractors (created_by);

create index if not exists inspection_events_actor_id_idx
  on public.inspection_events (actor_id);

create index if not exists inspection_media_captured_by_idx
  on public.inspection_media (captured_by);

create index if not exists inspection_media_company_account_id_idx
  on public.inspection_media (company_account_id);

create index if not exists inspection_phase_locks_holder_id_idx
  on public.inspection_phase_locks (holder_id);

create index if not exists inspections_assigned_by_idx
  on public.inspections (assigned_by);

create index if not exists inspections_created_by_idx
  on public.inspections (created_by);

create index if not exists inspections_driver_id_idx
  on public.inspections (driver_id);

create index if not exists inspections_tractor_id_idx
  on public.inspections (tractor_id);

create index if not exists inspector_permissions_updated_by_idx
  on public.inspector_permissions (updated_by);
