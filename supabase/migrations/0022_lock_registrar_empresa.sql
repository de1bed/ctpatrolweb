-- ============================================================================
-- CTPatrol · 0022 · Cerrar RPC registrar_empresa (anon / public)
--
-- Hallazgo P4: el alta de empresa+admin sigue ejecutándose por PostgREST
-- como SECURITY DEFINER con EXECUTE para `anon` y `authenticated`.
-- La página /registro está cerrada, pero cualquiera con la anon key puede
-- llamar /rest/v1/rpc/registrar_empresa y saltársela.
--
-- 0021 ya sustituye el cuerpo por un RAISE y revoca a anon/authenticated,
-- pero:
--   1) en producción aún no se ha aplicado (el cuerpo vivo es el de 0011);
--   2) no revoca a PUBLIC ni exige sesión, así que un GRANT accidental
--      volvería a abrir el hueco.
--
-- Esta migración es idempotente respecto a 0021. No se aplica sola al
-- proyecto vivo: hay que correrla desde el repo.
-- ============================================================================

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
begin
  -- Defensa en profundidad: si alguien vuelve a conceder EXECUTE a anon,
  -- una llamada sin sesión autenticada sigue rechazada.
  if (select auth.uid()) is null then
    raise exception 'No autorizado';
  end if;

  raise exception 'El registro público está deshabilitado. El acceso es solo por invitación.';
end;
$fn$;

comment on function public.registrar_empresa(text, text, text, text) is
  'CERRADA: no forma parte de la API. El registro público está deshabilitado; las empresas se crean por invitación. EXECUTE revocado a PUBLIC/anon/authenticated.';

revoke all on function public.registrar_empresa(text, text, text, text)
  from public, anon, authenticated;
