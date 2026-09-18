-- ============================================================================
-- CTPatrol · 0011 · El registro público exige confirmar el correo
--
-- Antes el RPC marcaba email_confirmed_at = now() y la app entraba sola.
-- Cualquiera podía crear una empresa con un correo ajeno o inventado.
-- El usuario queda creado, pero sin confirmar: no entra hasta el enlace
-- que manda Resend.
-- ============================================================================

create or replace function public.registrar_empresa(
  p_email text,
  p_password text,
  p_full_name text,
  p_company_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $fn$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_nombre text := trim(p_full_name);
  v_empresa text := trim(p_company_name);
  v_company uuid;
  v_code text;
begin
  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Correo inválido';
  end if;

  if length(v_nombre) < 2 then
    raise exception 'Escribe tu nombre';
  end if;

  if length(v_empresa) < 2 then
    raise exception 'Escribe el nombre de la empresa';
  end if;

  if length(p_password) < 10 then
    raise exception 'La contraseña debe tener al menos 10 caracteres';
  end if;

  if length(p_password) > 72 then
    raise exception 'La contraseña es demasiado larga';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Ya existe un usuario con ese correo';
  end if;

  v_code := public.generar_codigo_cuenta(v_empresa);

  insert into company_accounts (code, name)
  values (v_code, v_empresa)
  returning id into v_company;

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
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'company_account_id', v_company,
      'role', 'admin',
      'full_name', v_nombre,
      'company_name', v_empresa
    ),
    now(), now(),
    '', '', '', '',
    false, false
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_id::text, v_id,
    jsonb_build_object(
      'sub', v_id::text,
      'email', v_email,
      'email_verified', false
    ),
    'email', now(), now(), now()
  );

  return v_id;
end;
$fn$;

comment on function public.registrar_empresa(text, text, text, text) is
  'Alta pública: crea el tenant y al primer administrador sin confirmar el correo. La app manda el enlace de verificación por Resend.';
