-- El admin de la empresa marca la inspección como eliminada.
-- La fila sigue 30 días para que el super admin la consulte.
-- Nadie con sesión puede hacer DELETE: el purgado lo hace el servidor
-- con service role, que se salta RLS.

drop policy if exists inspections_admin_manage on inspections;

drop policy if exists inspections_select on inspections;
create policy inspections_select on inspections
  for select using (
    (
      deleted_at is null
      and (
        (company_account_id = current_company_account_id() and is_account_admin())
        or assigned_to = auth.uid()
        or created_by = auth.uid()
        or is_super_admin()
      )
    )
    or (
      is_super_admin()
      and deleted_at is not null
      and deleted_at > now() - interval '30 days'
    )
  );

create policy inspections_admin_update on inspections
  for update using (
    (
      company_account_id = current_company_account_id()
      and is_account_admin()
      and deleted_at is null
    )
    or is_super_admin()
  )
  with check (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );

create index if not exists inspections_deleted_at_idx
  on inspections (deleted_at desc)
  where deleted_at is not null;

-- Evidencia de una inspección en retención: solo el super admin la lee.
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
  with check (company_account_id = current_company_account_id());
