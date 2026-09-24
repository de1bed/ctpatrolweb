-- El cobro de 1 crédito lo hace el inspector, no el super admin.
-- El disparador bloqueaba ese update, y la política de inserción solo dejaba
-- escribir el movimiento al super admin. Las dos cosas devolvían un error
-- genérico al analizar la foto.

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

  -- consumir_credito_ia marca la transacción. Solo se permite bajar 1 crédito.
  if current_setting('ctpatrol.consumo_ia', true) = '1'
     and new.ia_plataforma is not distinct from old.ia_plataforma
     and new.ia_activa is not distinct from old.ia_activa
     and new.creditos_ia = old.creditos_ia - 1 then
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

  perform set_config('ctpatrol.consumo_ia', '1', true);

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

drop policy if exists ia_movimientos_insert_consumo on ia_movimientos;
create policy ia_movimientos_insert_consumo on ia_movimientos
  for insert with check (
    current_setting('ctpatrol.consumo_ia', true) = '1'
    and tipo = 'consumo'
    and creditos = -1
    and company_account_id = current_company_account_id()
    and actor_id = auth.uid()
  );
