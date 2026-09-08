-- ============================================================================
-- CTPatrol · 0005 · Endurecimiento
--
-- Correcciones al linter de seguridad de Supabase. Se hacen ahora, con la
-- base vacía, porque mover una extensión o cambiar permisos con datos
-- encima es mucho más delicado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. search_path fijo en set_updated_at
--
-- Sin search_path fijo, un usuario podría anteponer un esquema propio y
-- secuestrar lo que la función resuelve. Aplica a toda función que corra con
-- privilegios elevados o dentro de un trigger.
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 2. Las funciones de trigger no son API
--
-- PostgREST publica todo lo que vive en `public`. Estas funciones solo tienen
-- sentido colgadas de su trigger; nadie debe poder invocarlas por HTTP.
-- ----------------------------------------------------------------------------

revoke all on function handle_new_user()                     from public, anon, authenticated;
revoke all on function assign_inspection_display_id()        from public, anon, authenticated;
revoke all on function create_default_inspector_permissions() from public, anon, authenticated;
revoke all on function enforce_catalog_storage_mode()        from public, anon, authenticated;
revoke all on function set_updated_at()                      from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Helpers de autorización: se quedan ejecutables, y es correcto
--
-- Postgres evalúa las expresiones de RLS con los privilegios de QUIEN hace la
-- consulta. Si le quitáramos EXECUTE a `authenticated`, toda consulta contra
-- una tabla con RLS reventaría con "permission denied" en vez de devolver
-- las filas que le tocan.
--
-- Es seguro dejarlas: cada una responde únicamente sobre el usuario que
-- llama (su cuenta, su rol, sus permisos). No hay forma de preguntar por otro.
--
-- A `anon` sí se las quitamos: sin sesión no hay nada que responder.
-- ----------------------------------------------------------------------------

revoke all on function current_company_account_id() from anon;
revoke all on function current_user_role()          from anon;
revoke all on function is_super_admin()             from anon;
revoke all on function is_account_admin()           from anon;
revoke all on function can_create_catalog(text)     from anon;

grant execute on function current_company_account_id() to authenticated;
grant execute on function current_user_role()          to authenticated;
grant execute on function is_super_admin()             to authenticated;
grant execute on function is_account_admin()           to authenticated;
grant execute on function can_create_catalog(text)     to authenticated;

-- ----------------------------------------------------------------------------
-- 4. pg_trgm fuera de public
--
-- Una extensión en `public` expone sus funciones y operadores a la API. Se
-- mueve al esquema `extensions`, que Supabase ya trae en el search_path de
-- los roles. Los índices GIN que la usan siguen funcionando: Postgres
-- reescribe la referencia al operador al mover la extensión.
-- ----------------------------------------------------------------------------

alter extension pg_trgm set schema extensions;

-- ----------------------------------------------------------------------------
-- 5. inspection_counters: RLS encendido y CERO políticas, a propósito
--
-- Sin políticas, RLS niega todo. Es justo lo que queremos: al contador solo
-- lo toca assign_inspection_display_id(), que corre como SECURITY DEFINER y
-- por lo tanto se salta RLS. Ningún cliente tiene por qué leerlo ni moverlo.
--
-- El linter lo reporta como INFO "RLS enabled, no policy". Es intencional.
-- ----------------------------------------------------------------------------

comment on table inspection_counters is
  'Contador de folios. Sin políticas RLS a propósito: solo lo escribe el trigger SECURITY DEFINER.';

revoke all on table inspection_counters from anon, authenticated;
