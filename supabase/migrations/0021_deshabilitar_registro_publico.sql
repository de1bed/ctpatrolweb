-- ============================================================================
-- CTPatrol · 0021 · Deshabilitar registro público de empresas
--
-- El registro abierto (cualquiera puede crear empresa + admin) queda cerrado.
-- Las empresas se crean manualmente (SQL/panel Supabase) o en el futuro por
-- super admins. Los admins de empresa siguen pudiendo dar de alta usuarios
-- dentro de su cuenta con admin_crear_usuario.
-- ============================================================================

-- Revocar los grants que permitían llamar registrar_empresa desde anon/authenticated
revoke execute on function public.registrar_empresa(text, text, text, text) from anon, authenticated;

-- Reemplazar la función para que rechace explícitamente cualquier intento de uso
-- (por si alguien la llama con service role o desde dentro de otra función)
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
  raise exception 'El registro público está deshabilitado. El acceso es solo por invitación.';
end;
$fn$;

comment on function public.registrar_empresa(text, text, text, text) is
  'DESHABILITADA: El registro público está cerrado. Las empresas se crean manualmente por Vortex.';
