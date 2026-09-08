-- ============================================================================
-- CTPatrol · Semilla de DESARROLLO
--
-- ⚠️  SOLO PARA DESARROLLO. Nunca correr esto contra producción.
--
-- Crea una cuenta demo con un admin y un inspector para poder probar el flujo
-- completo sin depender de que alguien exista.
--
-- Las contraseñas van aquí en claro a propósito: son credenciales de juguete
-- de una base de juguete. El alta REAL de usuarios no pasa por SQL — pasa por
-- la API de administración de Auth desde el panel, que es la única forma
-- soportada y la que maneja bien confirmaciones, recuperación y MFA.
--
-- Idempotente: correrlo dos veces no duplica nada.
-- ============================================================================

do $seed$
declare
  v_cuenta     uuid;
  v_admin      uuid := gen_random_uuid();
  v_inspector  uuid := gen_random_uuid();
  v_password   text := 'CtpatrolDemo2026!';
begin
  -- ── Cuenta ──────────────────────────────────────────────────────────────
  insert into company_accounts (code, name)
  values ('DEMO', 'Transportes Demo')
  on conflict (code) do update set name = excluded.name
  returning id into v_cuenta;

  -- ── Admin ───────────────────────────────────────────────────────────────
  if not exists (select 1 from auth.users where email = 'admin@demo.mx') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- Estas cuatro NO tienen valor por defecto en el schema de Supabase, y
      -- GoTrue las lee en un tipo de Go que no acepta NULL. Si se dejan
      -- nulas, el login falla con "Database error querying schema" y el
      -- mensaje no dice nada sobre la causa real.
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin, 'authenticated', 'authenticated', 'admin@demo.mx',
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'company_account_id', v_cuenta,
        'role', 'admin',
        'full_name', 'Ana Delgado'
      ),
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_admin::text, v_admin,
      jsonb_build_object('sub', v_admin::text, 'email', 'admin@demo.mx'),
      'email', now(), now(), now()
    );
  end if;

  -- ── Inspector ───────────────────────────────────────────────────────────
  if not exists (select 1 from auth.users where email = 'inspector@demo.mx') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- Estas cuatro NO tienen valor por defecto en el schema de Supabase, y
      -- GoTrue las lee en un tipo de Go que no acepta NULL. Si se dejan
      -- nulas, el login falla con "Database error querying schema" y el
      -- mensaje no dice nada sobre la causa real.
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_inspector, 'authenticated', 'authenticated', 'inspector@demo.mx',
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'company_account_id', v_cuenta,
        'role', 'inspector',
        'full_name', 'Beto Ramírez'
      ),
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_inspector::text, v_inspector,
      jsonb_build_object('sub', v_inspector::text, 'email', 'inspector@demo.mx'),
      'email', now(), now(), now()
    );

    -- El trigger ya le creó la fila de permisos en ceros. Se le habilita
    -- arrancar inspecciones y capturar catálogo en modo efímero, que es la
    -- configuración típica de un inspector de campo.
    update inspector_permissions
    set can_start_new_inspection = true,
        can_create_driver     = true, driver_storage_mode    = 'ephemeral',
        can_create_tractor    = true, tractor_storage_mode   = 'ephemeral',
        can_create_container  = true, container_storage_mode = 'ephemeral'
    where profile_id = v_inspector;
  end if;

  raise notice 'Semilla lista. Cuenta DEMO: admin@demo.mx / inspector@demo.mx';
end;
$seed$;
