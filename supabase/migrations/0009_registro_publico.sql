-- ============================================================================
-- CTPatrol · 0009 · Registro público de empresa
--
-- Hasta aquí el alta era solo por admin (o el dashboard de Supabase).
-- Una empresa nueva puede crear su cuenta: nace el tenant y un administrador.
-- Los inspectores siguen dándose de alta desde el panel, no desde aquí.
-- ============================================================================

create or replace function public.generar_codigo_cuenta(p_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_base text;
  v_code text;
  v_n int := 0;
begin
  v_base := upper(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9]', '', 'g'));
  v_base := left(v_base, 6);

  if length(v_base) < 3 then
    v_base := rpad(coalesce(nullif(v_base, ''), 'EMP'), 3, 'X');
  end if;

  loop
    if v_n = 0 then
      v_code := v_base;
    else
      v_code := left(v_base, 8) || lpad((v_n % 1000)::text, 3, '0');
    end if;

    exit when not exists (select 1 from company_accounts where code = v_code);

    v_n := v_n + 1;
    if v_n > 999 then
      v_code := 'E' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (select 1 from company_accounts where code = v_code);
    end if;
  end loop;

  return v_code;
end;
$fn$;

comment on function public.generar_codigo_cuenta(text) is
  'Código único de 3–12 caracteres a partir del nombre de la empresa.';

revoke all on function public.generar_codigo_cuenta(text) from public, anon, authenticated;

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
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'company_account_id', v_company,
      'role', 'admin',
      'full_name', v_nombre
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
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email', now(), now(), now()
  );

  return v_id;
end;
$fn$;

comment on function public.registrar_empresa(text, text, text, text) is
  'Alta pública: crea el tenant y al primer administrador. Los inspectores se dan de alta después desde el panel.';

revoke all on function public.registrar_empresa(text, text, text, text) from public;
grant execute on function public.registrar_empresa(text, text, text, text) to anon, authenticated;
