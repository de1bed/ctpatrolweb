-- ============================================================================
-- CTPatrol · Prueba de aislamiento (RLS)
--
-- Corre esto DESPUÉS de la semilla, cada vez que se toque una política.
-- Si algo se rompe, revienta con un mensaje que dice qué falló.
--
-- Por qué existe: RLS es lo único que impide que la empresa A vea las
-- inspecciones de la empresa B. Un error aquí no se ve en la interfaz —
-- se ve cuando un cliente llama furioso. Y en el sistema anterior el
-- filtrado se hacía en el cliente, donde cualquiera con las herramientas
-- del navegador podía quitarlo.
--
-- Suplanta usuarios igual que lo hace PostgREST: rol `authenticated` más
-- el claim `sub` del JWT.
-- ============================================================================

do $test$
declare
  v_inspector uuid;
  v_admin     uuid;
  n integer;
begin
  select id into v_inspector from profiles where email = 'inspector@demo.mx';
  select id into v_admin     from profiles where email = 'admin@demo.mx';

  if v_inspector is null or v_admin is null then
    raise exception 'Faltan los usuarios de la semilla. Corre supabase/seed.sql primero.';
  end if;

  -- ── Como INSPECTOR ────────────────────────────────────────────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_inspector, 'role', 'authenticated')::text, true);

  -- Solo las inspecciones asignadas a él. Ni las de un compañero de la
  -- misma empresa, ni mucho menos las de otra empresa.
  select count(*) into n from inspections;
  if n <> 1 then
    raise exception 'FALLA inspector: ve % inspecciones, esperaba 1', n;
  end if;

  -- Catálogo: solo el de su cuenta.
  select count(*) into n from customers;
  if n <> 1 then
    raise exception 'FALLA inspector: ve % clientes, esperaba 1 (fuga entre cuentas)', n;
  end if;

  -- Sin permiso can_create_customer, no puede dar de alta clientes.
  begin
    insert into customers (company_account_id, name)
    values ((select company_account_id from profiles where id = v_inspector),
            'Intento Prohibido');
    raise exception 'FALLA: el inspector creó un cliente sin tener el permiso';
  exception when insufficient_privilege then
    null;  -- correcto
  end;

  -- ── Como ADMIN ────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- Ve todas las de SU cuenta (las dos de DEMO) y ninguna de RIVAL.
  select count(*) into n from inspections;
  if n <> 2 then
    raise exception 'FALLA admin: ve % inspecciones, esperaba 2', n;
  end if;

  perform set_config('role', 'postgres', true);
  raise notice '✅ RLS: todas las aserciones pasaron';
end;
$test$;

-- ============================================================================
-- Regresión · Modo de almacenamiento del catálogo
--
-- Bug encontrado el 2026-09-08: el trigger asumía que siempre hay usuario
-- autenticado y marcaba como EFÍMERO todo lo insertado desde el servidor.
-- Como el buscador excluye los efímeros, esos registros quedaban invisibles
-- en la app aunque existieran en la base. Ver migración 0006.
-- ============================================================================

do $test$
declare
  v_cuenta uuid;
  v_efimero boolean;
begin
  select id into v_cuenta from company_accounts where code = 'DEMO';

  -- Contexto de sistema (sin auth.uid()): debe quedar PERMANENTE.
  insert into customers (company_account_id, name)
  values (v_cuenta, 'Prueba Contexto Sistema')
  returning is_ephemeral into v_efimero;

  if v_efimero then
    raise exception 'FALLA: una inserción de sistema quedó marcada como efímera';
  end if;

  delete from customers where company_account_id = v_cuenta
    and name = 'Prueba Contexto Sistema';

  raise notice '✅ Catálogo: el contexto de sistema crea registros permanentes';
end;
$test$;
