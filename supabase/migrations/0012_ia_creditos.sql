-- ============================================================================
-- CTPatrol · 0012 · Créditos de IA
--
-- Dos interruptores, y los dos tienen que estar encendidos:
--   ia_plataforma  lo prende el super admin (esta empresa puede usar IA)
--   ia_activa      lo prende el admin de la empresa (en sus inspecciones)
-- Cada análisis de foto y cada escaneo de documento consume 1 crédito.
-- ============================================================================

alter table company_accounts
  add column ia_plataforma boolean not null default false,
  add column ia_activa boolean not null default false,
  add column creditos_ia integer not null default 0 check (creditos_ia >= 0);

comment on column company_accounts.ia_plataforma is
  'El super admin autoriza el análisis con IA para esta empresa.';
comment on column company_accounts.ia_activa is
  'El admin de la empresa enciende la IA en sus inspecciones. Solo cuenta si ia_plataforma es true.';
comment on column company_accounts.creditos_ia is
  'Créditos restantes. Cada uso de IA consume 1.';

create table ia_movimientos (
  id uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  tipo text not null check (tipo in ('consumo', 'recarga', 'reembolso')),
  creditos integer not null check (creditos <> 0),
  saldo integer not null check (saldo >= 0),
  inspection_id uuid,
  media_id uuid,
  actor_id uuid,
  nota text not null default '',
  reembolsado boolean not null default false,
  created_at timestamptz not null default now()
);

create index ia_movimientos_cuenta_idx
  on ia_movimientos (company_account_id, created_at desc);

alter table ia_movimientos enable row level security;

create policy ia_movimientos_select on ia_movimientos
  for select using (
    company_account_id = current_company_account_id()
    or is_super_admin()
  );

create policy ia_movimientos_insert_super on ia_movimientos
  for insert with check (is_super_admin());

-- El admin de la empresa no puede regalarse créditos ni autorizarse la IA.
create or replace function proteger_ia_cuenta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if coalesce(auth.role(), '') = 'service_role' or is_super_admin() then
    return new;
  end if;

  if new.ia_plataforma is distinct from old.ia_plataforma
     or new.creditos_ia is distinct from old.creditos_ia then
    raise exception 'Solo el super admin puede cambiar la autorización o los créditos de IA';
  end if;

  if new.ia_activa and not coalesce(old.ia_plataforma, false) then
    raise exception 'La IA no está autorizada para esta empresa';
  end if;

  return new;
end;
$fn$;

create trigger company_accounts_proteger_ia
  before update on company_accounts
  for each row execute function proteger_ia_cuenta();

-- Nadie se asciende a super admin desde la app. Solo otro super admin o
-- el service role (el alta inicial).
create or replace function proteger_rol_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role = 'super_admin'
     and (tg_op = 'INSERT' or old.role is distinct from 'super_admin')
     and coalesce(auth.role(), '') <> 'service_role'
     and not is_super_admin() then
    raise exception 'Solo un super admin puede otorgar ese rol';
  end if;
  return new;
end;
$fn$;

create trigger profiles_proteger_rol_super_admin
  before insert or update on profiles
  for each row execute function proteger_rol_super_admin();

create or replace function consumir_credito_ia(
  p_nota text,
  p_inspection_id uuid default null,
  p_media_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_company uuid;
  v_saldo integer;
  v_plataforma boolean;
  v_activa boolean;
  v_id uuid;
begin
  v_company := current_company_account_id();
  if v_company is null then
    raise exception 'IA_SIN_SESION';
  end if;

  select ia_plataforma, ia_activa, creditos_ia
    into v_plataforma, v_activa, v_saldo
  from company_accounts
  where id = v_company
  for update;

  if not coalesce(v_plataforma, false) then
    raise exception 'IA_NO_AUTORIZADA';
  end if;
  if not coalesce(v_activa, false) then
    raise exception 'IA_APAGADA';
  end if;
  if coalesce(v_saldo, 0) < 1 then
    raise exception 'IA_SIN_CREDITOS';
  end if;

  update company_accounts
    set creditos_ia = creditos_ia - 1
    where id = v_company
    returning creditos_ia into v_saldo;

  insert into ia_movimientos (
    company_account_id, tipo, creditos, saldo,
    inspection_id, media_id, actor_id, nota
  )
  values (
    v_company, 'consumo', -1, v_saldo,
    p_inspection_id, p_media_id, auth.uid(), coalesce(p_nota, '')
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

create or replace function reembolsar_credito_ia(p_movimiento uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_company uuid;
  v_saldo integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'IA_REEMBOLSO_NO_PERMITIDO';
  end if;

  select company_account_id into v_company
  from ia_movimientos
  where id = p_movimiento
    and tipo = 'consumo'
    and not reembolsado
  for update;

  if v_company is null then
    return null;
  end if;

  update company_accounts
    set creditos_ia = creditos_ia + 1
    where id = v_company
    returning creditos_ia into v_saldo;

  update ia_movimientos set reembolsado = true where id = p_movimiento;

  insert into ia_movimientos (
    company_account_id, tipo, creditos, saldo, nota
  )
  values (
    v_company, 'reembolso', 1, v_saldo, 'Reembolso por fallo de IA'
  );

  return v_saldo;
end;
$fn$;

revoke all on function consumir_credito_ia(text, uuid, uuid) from public, anon;
grant execute on function consumir_credito_ia(text, uuid, uuid) to authenticated;

revoke all on function reembolsar_credito_ia(uuid) from public, anon, authenticated;
grant execute on function reembolsar_credito_ia(uuid) to service_role;
