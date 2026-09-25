-- El admin puede marcar deleted_at.
-- La política anterior exigía deleted_at nulo también en la fila nueva,
-- así que el update que justamente lo llena nunca pasaba.

drop policy if exists inspections_admin_update on inspections;

create policy inspections_admin_update on inspections
  for update using (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  )
  with check (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );
