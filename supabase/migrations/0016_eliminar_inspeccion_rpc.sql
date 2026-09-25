-- El update directo no puede marcar deleted_at: la fila nueva deja de
-- ser visible para el admin y Postgres rechaza el cambio. Esta función
-- corre como dueña de la tabla, comprueba que sea admin de esa empresa
-- y hace la baja lógica.

create or replace function eliminar_inspeccion_empresa(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_company uuid;
begin
  if not (coalesce(is_account_admin(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'No puedes eliminar inspecciones';
  end if;

  select company_account_id into v_company
  from inspections
  where id = p_id and deleted_at is null;

  if v_company is null then
    raise exception 'No se encontró la inspección';
  end if;

  if not coalesce(is_super_admin(), false)
     and v_company is distinct from current_company_account_id() then
    raise exception 'No se encontró la inspección';
  end if;

  update inspections
    set deleted_at = now(),
        verification_revoked_at = coalesce(verification_revoked_at, now())
    where id = p_id;

  insert into inspection_events (inspection_id, actor_id, event, payload)
  values (p_id, auth.uid(), 'deleted', '{}'::jsonb);
end;
$fn$;

revoke all on function eliminar_inspeccion_empresa(uuid) from public, anon;
grant execute on function eliminar_inspeccion_empresa(uuid) to authenticated;
