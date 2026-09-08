-- ============================================================================
-- CTPatrol · 0001 · Fundación
--
-- Modelo multi-tenant: TODO cuelga de company_accounts (la empresa que
-- contrata CTPatrol). El aislamiento entre empresas se aplica con RLS, no
-- con filtros en el cliente.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

-- super_admin : nosotros (soporte). Ve todas las cuentas.
-- admin       : administrador de la empresa. Ve y gestiona su cuenta.
-- inspector   : operativo. Solo sus inspecciones.
create type user_role as enum ('super_admin', 'admin', 'inspector');

-- ----------------------------------------------------------------------------
-- Cuentas (tenants)
-- ----------------------------------------------------------------------------

create table company_accounts (
  id          uuid primary key default gen_random_uuid(),
  -- Código público que el usuario teclea al entrar (ej. "CRI220").
  code        text not null unique check (code = upper(code) and length(code) between 3 and 12),
  name        text not null check (length(trim(name)) > 0),
  logo_url    text,
  is_active   boolean not null default true,
  -- Preferencias de la cuenta (branding del reporte, correos por defecto, etc.)
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  company_accounts      is 'Tenant: cada empresa que contrata CTPatrol.';
comment on column company_accounts.code is 'Código público de acceso (ej. CRI220).';

-- ----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ----------------------------------------------------------------------------

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  company_account_id uuid not null references company_accounts(id) on delete restrict,
  role               user_role not null default 'inspector',
  full_name          text not null default '',
  email              text not null,
  phone              text,
  avatar_url         text,
  is_active          boolean not null default true,
  -- Correos a los que se copian los reportes que genera este usuario.
  report_emails      text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_company_role_idx on profiles (company_account_id, role) where is_active;

comment on table profiles is 'Perfil de usuario. El rol define si entra al panel admin o al flujo operativo.';

-- ----------------------------------------------------------------------------
-- Helpers de autorización
--
-- SECURITY DEFINER a propósito: corren como owner y por lo tanto NO disparan
-- RLS al leer profiles. Sin esto, las políticas de profiles se llamarían a sí
-- mismas y Postgres aborta por recursión infinita.
-- ----------------------------------------------------------------------------

create or replace function current_company_account_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select company_account_id from profiles where id = auth.uid() and is_active
$fn$;

create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select role from profiles where id = auth.uid() and is_active
$fn$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid() and is_active), false)
$fn$;

-- Admin de empresa o super admin: puede gestionar la cuenta.
create or replace function is_account_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce((select role in ('admin', 'super_admin') from profiles where id = auth.uid() and is_active), false)
$fn$;

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger company_accounts_set_updated_at
  before update on company_accounts
  for each row execute function set_updated_at();

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Alta de usuario
--
-- Los usuarios NO se auto-registran: un admin los crea con service role y pasa
-- company_account_id / role / full_name en user_metadata. Este trigger
-- materializa el perfil. Si falta la cuenta, falla ruidosamente en vez de
-- dejar un usuario huérfano sin tenant.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_company_account_id uuid;
begin
  v_company_account_id := (new.raw_user_meta_data ->> 'company_account_id')::uuid;

  if v_company_account_id is null then
    raise exception 'No se puede crear el usuario % sin company_account_id en user_metadata', new.email;
  end if;

  insert into profiles (id, company_account_id, role, full_name, email)
  values (
    new.id,
    v_company_account_id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'inspector'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table company_accounts enable row level security;
alter table profiles         enable row level security;

-- Cuentas: cada quien ve la suya; super admin ve todas.
create policy company_accounts_select on company_accounts
  for select using (id = current_company_account_id() or is_super_admin());

create policy company_accounts_update on company_accounts
  for update using (
    (id = current_company_account_id() and is_account_admin()) or is_super_admin()
  );

-- Perfiles: uno ve el suyo; los admins ven los de su cuenta.
create policy profiles_select on profiles
  for select using (
    id = auth.uid()
    or (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );

-- Uno puede editar su propio perfil (nombre, teléfono, avatar).
-- El WITH CHECK impide auto-ascenderse de rol o brincar de cuenta: compara
-- contra los helpers SECURITY DEFINER, que leen el valor ya persistido.
create policy profiles_update_self on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = current_user_role()
    and company_account_id = current_company_account_id()
  );

create policy profiles_admin_manage on profiles
  for all using (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  )
  with check (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );
