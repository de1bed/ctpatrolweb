-- ============================================================================
-- CTPatrol · 0006 · Corrección: contexto de sistema en el modo de catálogo
--
-- ── El bug ──────────────────────────────────────────────────────────────────
--
-- `enforce_catalog_storage_mode` daba por hecho que siempre hay un usuario
-- autenticado. Cuando no lo hay —service role, una migración, un script de
-- importación, la semilla— `auth.uid()` es null, la consulta a
-- inspector_permissions no devuelve fila, y el COALESCE caía en 'ephemeral'.
--
-- Resultado: todo registro creado desde el servidor nacía marcado como
-- efímero y, como el buscador de catálogo excluye los efímeros, quedaba
-- invisible. Se detectó al buscar un transportista sembrado que existía en la
-- base pero no aparecía nunca en la app.
--
-- ── La corrección ───────────────────────────────────────────────────────────
--
-- Sin usuario autenticado estamos en contexto de sistema, y ahí se respeta lo
-- que venga en la fila (por defecto, permanente). La coerción por permisos
-- aplica ÚNICAMENTE a un inspector real que está capturando en campo, que es
-- para quien se diseñó la regla.
--
-- Esto no abre un hueco de seguridad: llegar sin auth.uid() ya implica tener
-- la llave de service role, y con ella se puede escribir cualquier cosa de
-- todos modos. La regla existe para proteger el catálogo de los typos de
-- campo, no para contener a quien ya es administrador de la base.
-- ============================================================================

create or replace function enforce_catalog_storage_mode()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_mode  catalog_storage_mode;
  v_kind  text := tg_argv[0];
  v_uid   uuid := auth.uid();
begin
  new.created_by := coalesce(new.created_by, v_uid);

  -- Contexto de sistema: sin sesión no hay permisos de campo que aplicar.
  if v_uid is null then
    new.is_ephemeral := coalesce(new.is_ephemeral, false);
    return new;
  end if;

  -- Un admin de la cuenta siempre crea catálogo permanente.
  if is_account_admin() then
    new.is_ephemeral := coalesce(new.is_ephemeral, false);
    return new;
  end if;

  -- Inspector: manda su permiso, no lo que traiga la fila.
  select case v_kind
    when 'customer'  then customer_storage_mode
    when 'driver'    then driver_storage_mode
    when 'tractor'   then tractor_storage_mode
    when 'container' then container_storage_mode
  end
  into v_mode
  from inspector_permissions
  where profile_id = v_uid;

  new.is_ephemeral := coalesce(v_mode, 'ephemeral') = 'ephemeral';
  return new;
end;
$fn$;

revoke all on function enforce_catalog_storage_mode() from public, anon, authenticated;

-- ── Reparación de los datos afectados ───────────────────────────────────────
-- Los registros sin autor solo pudieron nacer en contexto de sistema, así que
-- nunca debieron quedar efímeros.
update customers  set is_ephemeral = false where created_by is null and is_ephemeral;
update drivers    set is_ephemeral = false where created_by is null and is_ephemeral;
update tractors   set is_ephemeral = false where created_by is null and is_ephemeral;
update containers set is_ephemeral = false where created_by is null and is_ephemeral;
