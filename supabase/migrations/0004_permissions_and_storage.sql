-- ============================================================================
-- CTPatrol · 0004 · Permisos de inspector y almacenamiento
--
-- El admin controla, por inspector, qué puede hacer en campo. Dos ejes:
--
--   can_create_*     ¿puede dar de alta un registro que no existe?
--   *_storage_mode   si lo da de alta, ¿se queda en el catálogo (persist)
--                    o solo vive para esa inspección (ephemeral)?
--
-- Esto existe porque el catálogo es un activo de la empresa: un inspector
-- apurado escribiendo "TRANPORTES DEL NORTE" lo ensucia para siempre.
-- ============================================================================

create type catalog_storage_mode as enum ('persist', 'ephemeral');

create table inspector_permissions (
  profile_id uuid primary key references profiles(id) on delete cascade,

  -- ¿Puede arrancar una inspección por su cuenta, o solo trabaja las que
  -- el admin le asigna?
  can_start_new_inspection boolean not null default false,

  can_create_customer  boolean not null default false,
  customer_storage_mode catalog_storage_mode not null default 'ephemeral',

  can_create_driver    boolean not null default false,
  driver_storage_mode  catalog_storage_mode not null default 'ephemeral',

  can_create_tractor   boolean not null default false,
  tractor_storage_mode catalog_storage_mode not null default 'ephemeral',

  can_create_container   boolean not null default false,
  container_storage_mode catalog_storage_mode not null default 'ephemeral',

  -- Datos que normalmente precarga el admin desde el panel. Si el inspector
  -- no tiene permiso, los ve en solo lectura.
  can_edit_documents     boolean not null default false,
  can_edit_movement_data boolean not null default false,

  -- Las evidencias físicas (fotos y videos) SIEMPRE están permitidas:
  -- son la razón de ser de la app y no tiene sentido bloquearlas.

  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inspector_permissions_set_updated_at
  before update on inspector_permissions
  for each row execute function set_updated_at();

comment on table inspector_permissions is
  'Permisos de campo por inspector, controlados desde el panel admin. Ausencia de fila = todo denegado.';

-- Todo inspector nuevo nace con una fila de permisos (todos en false), para
-- que el panel siempre tenga algo que mostrar y no haya que manejar el caso
-- "no existe" en el cliente.
create or replace function create_default_inspector_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role = 'inspector' then
    insert into inspector_permissions (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$fn$;

create trigger profiles_create_default_permissions
  after insert on profiles
  for each row execute function create_default_inspector_permissions();

-- ----------------------------------------------------------------------------
-- Helper: ¿el inspector actual puede crear este tipo de catálogo?
-- ----------------------------------------------------------------------------

create or replace function can_create_catalog(kind text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(
    (select case kind
       when 'customer'  then can_create_customer
       when 'driver'    then can_create_driver
       when 'tractor'   then can_create_tractor
       when 'container' then can_create_container
       else false
     end
     from inspector_permissions where profile_id = auth.uid()),
    false
  )
$fn$;

-- ----------------------------------------------------------------------------
-- RLS de permisos
-- ----------------------------------------------------------------------------

alter table inspector_permissions enable row level security;

-- El inspector lee los suyos (la app necesita saber qué habilitar en la UI).
create policy inspector_permissions_select_own on inspector_permissions
  for select using (profile_id = auth.uid());

-- Solo el admin los modifica.
create policy inspector_permissions_admin_manage on inspector_permissions
  for all using (
    exists (
      select 1 from profiles p
      where p.id = inspector_permissions.profile_id
        and p.company_account_id = current_company_account_id()
        and is_account_admin()
    )
    or is_super_admin()
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = inspector_permissions.profile_id
        and p.company_account_id = current_company_account_id()
        and is_account_admin()
    )
    or is_super_admin()
  );

-- ----------------------------------------------------------------------------
-- Altas de catálogo desde campo
--
-- El inspector solo puede INSERTAR (nunca editar ni borrar catálogo existente)
-- y solo si el permiso está encendido. El modo de almacenamiento lo fuerza un
-- trigger, no el cliente: si el cliente pudiera mandar is_ephemeral = false,
-- el permiso no serviría de nada.
-- ----------------------------------------------------------------------------

create policy customers_inspector_insert on customers
  for insert with check (
    company_account_id = current_company_account_id() and can_create_catalog('customer')
  );

create policy drivers_inspector_insert on drivers
  for insert with check (
    company_account_id = current_company_account_id() and can_create_catalog('driver')
  );

create policy tractors_inspector_insert on tractors
  for insert with check (
    company_account_id = current_company_account_id() and can_create_catalog('tractor')
  );

create policy containers_inspector_insert on containers
  for insert with check (
    company_account_id = current_company_account_id() and can_create_catalog('container')
  );

-- Fuerza is_ephemeral según el permiso del inspector. Los admins quedan
-- exentos: lo que ellos dan de alta siempre es permanente.
create or replace function enforce_catalog_storage_mode()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_mode catalog_storage_mode;
  v_kind text := tg_argv[0];
begin
  new.created_by := coalesce(new.created_by, auth.uid());

  if is_account_admin() then
    new.is_ephemeral := coalesce(new.is_ephemeral, false);
    return new;
  end if;

  select case v_kind
    when 'customer'  then customer_storage_mode
    when 'driver'    then driver_storage_mode
    when 'tractor'   then tractor_storage_mode
    when 'container' then container_storage_mode
  end
  into v_mode
  from inspector_permissions
  where profile_id = auth.uid();

  new.is_ephemeral := coalesce(v_mode, 'ephemeral') = 'ephemeral';
  return new;
end;
$fn$;

create trigger customers_enforce_storage_mode
  before insert on customers
  for each row execute function enforce_catalog_storage_mode('customer');

create trigger drivers_enforce_storage_mode
  before insert on drivers
  for each row execute function enforce_catalog_storage_mode('driver');

create trigger tractors_enforce_storage_mode
  before insert on tractors
  for each row execute function enforce_catalog_storage_mode('tractor');

create trigger containers_enforce_storage_mode
  before insert on containers
  for each row execute function enforce_catalog_storage_mode('container');

-- ============================================================================
-- Almacenamiento
--
-- Buckets privados. Las fotos de inspección son evidencia legal: nunca
-- públicas. El acceso se da con URLs firmadas de vida corta.
--
-- Convención de ruta:  <company_account_id>/<inspection_id>/<archivo>
-- La primera carpeta es el tenant, y de ahí cuelga la política.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('inspection-media', 'inspection-media', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'image/svg+xml']),
  ('reports', 'reports', false, 52428800,
   array['application/pdf', 'text/html'])
on conflict (id) do nothing;

create policy inspection_media_read on storage.objects
  for select using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = current_company_account_id()::text
  );

create policy inspection_media_write on storage.objects
  for insert with check (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = current_company_account_id()::text
  );

-- Reemplazar una evidencia (reintento de subida) sí; borrarla, solo el admin.
create policy inspection_media_update on storage.objects
  for update using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = current_company_account_id()::text
  );

create policy inspection_media_delete on storage.objects
  for delete using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = current_company_account_id()::text
    and is_account_admin()
  );

create policy reports_read on storage.objects
  for select using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = current_company_account_id()::text
  );

-- Los reportes los escribe el servidor con service role, no el navegador.
