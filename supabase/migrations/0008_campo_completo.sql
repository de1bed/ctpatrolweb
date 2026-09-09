-- ============================================================================
-- CTPatrol · 0008 · Campo usable sin service role
--
-- 1. Alta de usuarios desde el panel sin SUPABASE_SERVICE_ROLE_KEY.
-- 2. Un inspector nuevo nace pudiendo trabajar en patio (alta efímera),
--    no atorado esperando que un admin le active cada interruptor.
-- ============================================================================

create or replace function public.admin_crear_usuario(
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.user_role
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $fn$
declare
  v_id uuid := gen_random_uuid();
  v_company uuid;
  v_email text := lower(trim(p_email));
begin
  if not is_account_admin() then
    raise exception 'No autorizado';
  end if;

  v_company := current_company_account_id();
  if v_company is null then
    raise exception 'Sin cuenta activa';
  end if;

  if p_role not in ('inspector', 'admin') then
    raise exception 'Rol no permitido';
  end if;

  if length(p_password) < 10 then
    raise exception 'La contraseña debe tener al menos 10 caracteres';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Ya existe un usuario con ese correo';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'company_account_id', v_company,
      'role', p_role::text,
      'full_name', p_full_name
    ),
    now(), now(),
    '', '', '', '',
    false, false
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, email
  ) values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email', now(), now(), now(), v_email
  );

  return v_id;
end;
$fn$;

revoke all on function public.admin_crear_usuario(text, text, text, public.user_role) from public, anon;
grant execute on function public.admin_crear_usuario(text, text, text, public.user_role) to authenticated;

create or replace function create_default_inspector_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role = 'inspector' then
    insert into inspector_permissions (
      profile_id,
      can_start_new_inspection,
      can_create_customer,
      can_create_driver,
      can_create_tractor,
      can_create_container,
      can_edit_documents,
      can_edit_movement_data
    )
    values (new.id, true, true, true, true, true, true, true)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$fn$;

-- Inspectores que ya existían con todo en false: que puedan registrar en campo.
update inspector_permissions p
set
  can_start_new_inspection = true,
  can_create_customer = true,
  can_create_driver = true,
  can_create_tractor = true,
  can_create_container = true,
  can_edit_documents = true,
  can_edit_movement_data = true
where p.can_start_new_inspection = false
  and p.can_create_customer = false
  and p.can_create_driver = false
  and p.can_create_tractor = false
  and p.can_create_container = false;

-- El inspector DEMO también debe poder registrar transportista.
update inspector_permissions
set
  can_create_customer = true,
  can_edit_documents = true,
  can_edit_movement_data = true
where profile_id in (select id from profiles where email = 'inspector@demo.mx');
