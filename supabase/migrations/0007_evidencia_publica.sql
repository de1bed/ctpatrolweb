-- ============================================================================
-- CTPatrol · 0007 · Verificación pública de evidencia
--
-- Una inspección termina en papel: el reporte impreso viaja con la unidad y
-- alguien en aduana necesita poder confirmar que ese papel corresponde a una
-- inspección real y no a una fotocopia alterada.
--
-- Para eso el reporte lleva un QR que abre una página pública mínima. Esa
-- página NO muestra evidencia sensible: confirma el folio, la fecha, la
-- unidad y el resultado. Ni fotos, ni documentos, ni datos del cliente.
--
-- ── Cómo se protege ─────────────────────────────────────────────────────────
--
-- El enlace lleva un token aleatorio de 32 bytes, no el id de la inspección.
-- Con el id, quien viera un folio podría tantear otros; con un token
-- aleatorio no hay nada que adivinar. Y el token se puede revocar sin tocar
-- la inspección.
-- ============================================================================

alter table inspections
  add column verification_token text unique,
  add column verification_revoked_at timestamptz;

comment on column inspections.verification_token is
  'Token del QR de verificación pública. Aleatorio, revocable, no derivado del id.';

create index inspections_verification_token_idx
  on inspections (verification_token)
  where verification_token is not null;

/**
 * Genera el token al cerrar la inspección.
 *
 * Solo al cerrar: una inspección a medias no tiene nada que verificar, y un
 * token vivo antes de tiempo sería un enlace público a un expediente
 * incompleto.
 */
create or replace function generar_token_verificacion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
begin
  if new.status = 'completed'
     and (old.status is distinct from 'completed')
     and new.verification_token is null then
    -- 32 bytes en base64 url-safe: imposible de adivinar y cabe en un QR
    -- que se lee bien impreso a 2 cm.
    new.verification_token := replace(
      replace(encode(gen_random_bytes(24), 'base64'), '/', '_'),
      '+', '-'
    );
  end if;
  return new;
end;
$fn$;

create trigger inspections_generar_token
  before update on inspections
  for each row execute function generar_token_verificacion();

revoke all on function generar_token_verificacion() from public, anon, authenticated;

/**
 * Consulta pública de verificación.
 *
 * SECURITY DEFINER para poder leer sin sesión, pero devuelve ÚNICAMENTE los
 * campos que confirman autenticidad. Es deliberadamente pobre: cualquier dato
 * de más aquí es un dato que se filtra con solo tener el enlace.
 *
 * No expone: fotos, documentos, conductor, comentarios, hallazgos detallados
 * ni nada del catálogo de la empresa.
 */
create or replace function verificar_inspeccion(token text)
returns table (
  folio text,
  empresa text,
  fecha_inspeccion timestamptz,
  tipo_transporte text,
  tractor text,
  resultado text,
  hallazgos integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select
    i.display_id,
    ca.name,
    i.completed_at,
    i.transport_type::text,
    i.tractor_number,
    case when i.passed then 'aprobada' else 'rechazada' end,
    i.findings_count
  from inspections i
  join company_accounts ca on ca.id = i.company_account_id
  where i.verification_token = token
    and i.status = 'completed'
    and i.deleted_at is null
    and i.verification_revoked_at is null
  limit 1
$fn$;

-- Esta sí es pública a propósito: es el punto del QR.
grant execute on function verificar_inspeccion(text) to anon, authenticated;
