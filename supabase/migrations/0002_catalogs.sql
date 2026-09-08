-- ============================================================================
-- CTPatrol · 0002 · Catálogos
--
-- Los catálogos son los datos que el inspector selecciona durante la
-- inspección: transportista, conductor, tractor, contenedor.
--
-- Un catálogo puede nacer de dos formas:
--   1. Lo da de alta el admin desde el panel (permanente).
--   2. Lo captura el inspector en campo porque no existía.
--
-- Para el caso 2 el admin decide, por inspector, si ese registro se queda en
-- el catálogo (persist) o si solo vive para esa inspección (ephemeral). Eso
-- evita que el catálogo se ensucie con typos de campo, que fue justo el
-- problema del sistema anterior.
-- ============================================================================

create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- Transportistas / clientes
-- ----------------------------------------------------------------------------

create table customers (
  id                 uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  tax_id             text,
  notes              text,

  -- Efímero: nació en campo y el inspector no tiene permiso de persistir.
  -- Se conserva por trazabilidad (el reporte lo referencia) pero no aparece
  -- en el buscador de futuras inspecciones.
  is_ephemeral       boolean not null default false,
  created_by         uuid references profiles(id) on delete set null,

  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Un transportista no se repite dentro de una misma cuenta (ignorando mayúsculas).
-- Solo aplica a los permanentes: los efímeros sí pueden duplicar nombre.
create unique index customers_unique_name_idx
  on customers (company_account_id, lower(trim(name)))
  where not is_ephemeral;

create index customers_search_idx on customers using gin (name gin_trgm_ops);
create index customers_account_idx on customers (company_account_id) where is_active and not is_ephemeral;

-- ----------------------------------------------------------------------------
-- Conductores
-- ----------------------------------------------------------------------------

create table drivers (
  id                 uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  customer_id        uuid references customers(id) on delete set null,

  name               text not null check (length(trim(name)) > 0),
  license_number     text,
  license_expires_at date,
  phone              text,

  is_ephemeral       boolean not null default false,
  created_by         uuid references profiles(id) on delete set null,

  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index drivers_search_idx   on drivers using gin (name gin_trgm_ops);
create index drivers_customer_idx on drivers (customer_id) where is_active;
create index drivers_account_idx  on drivers (company_account_id) where is_active and not is_ephemeral;

-- ----------------------------------------------------------------------------
-- Tractores
-- ----------------------------------------------------------------------------

create table tractors (
  id                 uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  customer_id        uuid references customers(id) on delete set null,

  unit_number        text not null check (length(trim(unit_number)) > 0),
  plates             text,
  plates_state       text,
  brand              text,
  model_year         smallint check (model_year between 1950 and 2100),

  is_ephemeral       boolean not null default false,
  created_by         uuid references profiles(id) on delete set null,

  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index tractors_search_idx   on tractors using gin (unit_number gin_trgm_ops);
create index tractors_plates_idx   on tractors using gin (plates gin_trgm_ops);
create index tractors_customer_idx on tractors (customer_id) where is_active;
create index tractors_account_idx  on tractors (company_account_id) where is_active and not is_ephemeral;

-- ----------------------------------------------------------------------------
-- Contenedores / cajas
-- ----------------------------------------------------------------------------

create table containers (
  id                 uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  customer_id        uuid references customers(id) on delete set null,

  number             text not null check (length(trim(number)) > 0),
  plates             text,
  plates_state       text,
  size               text check (size in ('20', '40', '45', '48', '53')),

  is_ephemeral       boolean not null default false,
  created_by         uuid references profiles(id) on delete set null,

  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index containers_search_idx   on containers using gin (number gin_trgm_ops);
create index containers_customer_idx on containers (customer_id) where is_active;
create index containers_account_idx  on containers (company_account_id) where is_active and not is_ephemeral;

-- ----------------------------------------------------------------------------
-- updated_at
-- ----------------------------------------------------------------------------

create trigger customers_set_updated_at  before update on customers  for each row execute function set_updated_at();
create trigger drivers_set_updated_at    before update on drivers    for each row execute function set_updated_at();
create trigger tractors_set_updated_at   before update on tractors   for each row execute function set_updated_at();
create trigger containers_set_updated_at before update on containers for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
--
-- Lectura: cualquiera de la cuenta (el inspector necesita buscar catálogos).
-- Escritura: admins siempre; inspectores según sus permisos, que se validan
-- en 0004 una vez que existe la tabla de permisos.
-- ----------------------------------------------------------------------------

alter table customers  enable row level security;
alter table drivers    enable row level security;
alter table tractors   enable row level security;
alter table containers enable row level security;

create policy customers_select on customers
  for select using (company_account_id = current_company_account_id() or is_super_admin());

create policy drivers_select on drivers
  for select using (company_account_id = current_company_account_id() or is_super_admin());

create policy tractors_select on tractors
  for select using (company_account_id = current_company_account_id() or is_super_admin());

create policy containers_select on containers
  for select using (company_account_id = current_company_account_id() or is_super_admin());

create policy customers_admin_manage on customers
  for all using ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin())
  with check ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin());

create policy drivers_admin_manage on drivers
  for all using ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin())
  with check ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin());

create policy tractors_admin_manage on tractors
  for all using ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin())
  with check ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin());

create policy containers_admin_manage on containers
  for all using ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin())
  with check ((company_account_id = current_company_account_id() and is_account_admin()) or is_super_admin());
