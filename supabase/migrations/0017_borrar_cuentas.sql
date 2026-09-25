-- Borrado real de una empresa de prueba o de una persona.
-- El correo queda libre para registrarse otra vez.
-- No toca la empresa ni la cuenta de un super admin.

create or replace function eliminar_persona_plataforma(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_rol user_role;
begin
  if not coalesce(is_super_admin(), false) then
    raise exception 'No puedes borrar usuarios';
  end if;

  if p_id = auth.uid() then
    raise exception 'No puedes borrarte a ti mismo';
  end if;

  select role into v_rol from profiles where id = p_id;
  if v_rol is null then
    raise exception 'No se encontró a esa persona';
  end if;
  if v_rol = 'super_admin' then
    raise exception 'No se puede borrar un super admin';
  end if;

  delete from auth.users where id = p_id;
end;
$fn$;

create or replace function eliminar_empresa_plataforma(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
begin
  if not coalesce(is_super_admin(), false) then
    raise exception 'No puedes borrar empresas';
  end if;

  if not exists (select 1 from company_accounts where id = p_id) then
    raise exception 'No se encontró la empresa';
  end if;

  if exists (
    select 1 from profiles
    where company_account_id = p_id
      and (role = 'super_admin' or id = auth.uid())
  ) then
    raise exception 'No se puede borrar la empresa de un super admin';
  end if;

  delete from auth.users
  where id in (select id from profiles where company_account_id = p_id);

  delete from company_accounts where id = p_id;
end;
$fn$;

revoke all on function eliminar_persona_plataforma(uuid) from public, anon;
revoke all on function eliminar_empresa_plataforma(uuid) from public, anon;
grant execute on function eliminar_persona_plataforma(uuid) to authenticated;
grant execute on function eliminar_empresa_plataforma(uuid) to authenticated;
