-- ============================================================================
-- CTPatrol · 0003 · Inspecciones
--
-- Estrategia de modelado (híbrida, a propósito):
--
--   · Columnas estructuradas para lo que el ADMIN filtra, ordena y reporta:
--     estado, fechas, inspector, transportista, tipo de transporte.
--     Estas necesitan índices y constraints reales.
--
--   · JSONB para el CONTENIDO del formulario por fase.
--     El formulario C-TPAT cambia (se agregan puntos, cambian los criterios).
--     Si cada campo fuera una columna, cada ajuste sería una migración y un
--     deploy. Con JSONB, agregar una fase es un cambio de configuración.
--
-- La regla: si el admin lo busca o lo grafica, es columna. Si solo se captura
-- y se imprime en el reporte, es JSONB.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type inspection_status as enum (
  'draft',        -- la creó el admin, todavía sin asignar
  'assigned',     -- asignada a un inspector, aún no la abre
  'in_progress',  -- el inspector está capturando
  'paused',       -- pausada (ej. el trailer se fue a cargar)
  'completed',    -- terminada y firmada
  'cancelled'     -- abortada
);

create type transport_type as enum (
  'caja', 'caja_refrigerada', 'contenedor', 'plataforma',
  'van', 'rabon', 'torton', 'pipa', 'lowboy'
);

create type movement_type as enum ('importacion', 'exportacion', 'local', 'otro');

-- Estado de carga al entrar y al salir.
create type load_status   as enum ('cargado', 'vacio', 'botando');

-- ----------------------------------------------------------------------------
-- Inspecciones
-- ----------------------------------------------------------------------------

create table inspections (
  id                 uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references company_accounts(id) on delete cascade,

  -- Folio legible que aparece en el reporte y en el QR. Lo genera un trigger,
  -- nunca el cliente: en el sistema anterior el ID se generaba en el teléfono
  -- y se duplicaba cuando dos inspectores capturaban al mismo tiempo.
  display_id         text not null,

  status             inspection_status not null default 'draft',

  -- ── Asignación ───────────────────────────────────────────────────────────
  assigned_to        uuid references profiles(id) on delete set null,
  assigned_by        uuid references profiles(id) on delete set null,
  assigned_at        timestamptz,
  scheduled_for      timestamptz,

  created_by         uuid references profiles(id) on delete set null,

  -- ── Sujeto de la inspección ──────────────────────────────────────────────
  customer_id        uuid references customers(id)  on delete set null,
  driver_id          uuid references drivers(id)    on delete set null,
  tractor_id         uuid references tractors(id)   on delete set null,

  -- Snapshot del nombre al momento de inspeccionar. Si mañana el admin corrige
  -- el catálogo, el reporte histórico debe seguir diciendo lo que decía.
  customer_name      text,
  driver_name        text,
  tractor_number     text,

  -- ── Transporte ───────────────────────────────────────────────────────────
  transport_type     transport_type,
  is_full            boolean not null default false,  -- doble caja / doble contenedor
  movement           movement_type,
  movement_other     text,
  entry_status       load_status,
  exit_status        load_status,

  -- ── Tiempos ──────────────────────────────────────────────────────────────
  entered_at         timestamptz,   -- llegó la unidad
  started_at         timestamptz,   -- arrancó la inspección
  paused_at          timestamptz,
  completed_at       timestamptz,
  -- Segundos efectivos de inspección, sin contar pausas.
  duration_seconds   integer,

  -- ── Ubicación GPS ────────────────────────────────────────────────────────
  latitude           double precision,
  longitude          double precision,
  location_accuracy  double precision,
  location_captured  boolean not null default false,

  -- ── Contenido del formulario ─────────────────────────────────────────────
  -- data     : respuestas por fase  { "phase_id": { ...campos } }
  -- progress : { completedPhases: [], visitedPhases: [], currentPhase: "" }
  -- timings  : segundos por pantalla { "phase_id": 42 }
  -- ai       : resultados de análisis y verificación por IA
  data               jsonb not null default '{}'::jsonb,
  progress           jsonb not null default '{}'::jsonb,
  timings            jsonb not null default '{}'::jsonb,
  ai                 jsonb not null default '{}'::jsonb,

  -- Campos que el inspector marcó explícitamente como "no aplica".
  -- Se guardan aparte para poder distinguir "no aplica" de "se le olvidó".
  not_applicable     jsonb not null default '[]'::jsonb,

  -- ── Resultado ────────────────────────────────────────────────────────────
  -- Se llena al cerrar: si algún punto crítico salió mal, la inspección
  -- se marca como rechazada.
  passed             boolean,
  findings_count     integer not null default 0,

  report_url         text,
  evidence_url       text,

  -- Borrado lógico: un expediente de inspección no se borra de verdad.
  deleted_at         timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint inspections_display_id_unique unique (company_account_id, display_id),
  -- Una inspección terminada tiene que tener fecha de término.
  constraint inspections_completed_has_date
    check (status <> 'completed' or completed_at is not null)
);

create index inspections_account_status_idx on inspections (company_account_id, status, created_at desc)
  where deleted_at is null;
create index inspections_assigned_idx on inspections (assigned_to, status)
  where deleted_at is null;
create index inspections_customer_idx on inspections (customer_id)
  where deleted_at is null;
create index inspections_completed_idx on inspections (company_account_id, completed_at desc)
  where status = 'completed' and deleted_at is null;
create index inspections_display_id_idx on inspections (display_id);

comment on column inspections.data       is 'Respuestas del formulario por fase. Ver src/lib/inspection/schema.ts';
comment on column inspections.display_id is 'Folio legible (ej. CRI-260908-014). Generado por trigger, nunca por el cliente.';

-- ----------------------------------------------------------------------------
-- Folio consecutivo por cuenta y por día
--
-- Se apoya en una tabla de contadores con UPSERT atómico. Dos inspectores
-- creando al mismo tiempo se serializan en la fila del contador y cada uno
-- se lleva un número distinto.
-- ----------------------------------------------------------------------------

create table inspection_counters (
  company_account_id uuid not null references company_accounts(id) on delete cascade,
  day                date not null,
  last_number        integer not null default 0,
  primary key (company_account_id, day)
);

create or replace function assign_inspection_display_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_code   text;
  v_day    date := (now() at time zone 'utc')::date;
  v_number integer;
begin
  if new.display_id is not null and new.display_id <> '' then
    return new;  -- ya viene asignado (ej. restauración de respaldo)
  end if;

  select code into v_code from company_accounts where id = new.company_account_id;

  insert into inspection_counters (company_account_id, day, last_number)
  values (new.company_account_id, v_day, 1)
  on conflict (company_account_id, day)
  do update set last_number = inspection_counters.last_number + 1
  returning last_number into v_number;

  new.display_id := format('%s-%s-%s',
    coalesce(v_code, 'CTP'),
    to_char(v_day, 'YYMMDD'),
    lpad(v_number::text, 3, '0')
  );

  return new;
end;
$fn$;

create trigger inspections_assign_display_id
  before insert on inspections
  for each row execute function assign_inspection_display_id();

create trigger inspections_set_updated_at
  before update on inspections
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Evidencia (fotos, videos, firmas)
--
-- Tabla propia y no un array en JSONB porque cada archivo tiene ciclo de vida
-- propio: se captura offline, se sube después, puede fallar y reintentarse,
-- y la IA lo analiza de forma asíncrona.
-- ----------------------------------------------------------------------------

create type media_kind as enum ('photo', 'video', 'signature', 'document');

create type media_upload_status as enum ('pending', 'uploading', 'uploaded', 'failed');

create table inspection_media (
  id                 uuid primary key default gen_random_uuid(),
  inspection_id      uuid not null references inspections(id) on delete cascade,
  company_account_id uuid not null references company_accounts(id) on delete cascade,

  kind               media_kind not null default 'photo',

  -- Dónde encaja esta evidencia dentro del flujo.
  phase              text not null,
  point_key          text,              -- punto de inspección (ej. "tractor_defensa")
  point_label        text,
  container_position smallint,          -- 1 o 2 cuando es full

  -- ── Archivo ──────────────────────────────────────────────────────────────
  -- El cliente genera este id cuando captura offline, para poder reconciliar
  -- sin depender del servidor.
  client_id          text,
  storage_path       text,
  mime_type          text,
  size_bytes         bigint,
  width              integer,
  height             integer,
  duration_seconds   numeric(6,2),

  upload_status      media_upload_status not null default 'pending',
  upload_error       text,
  uploaded_at        timestamptz,

  -- ── Metadatos de captura ─────────────────────────────────────────────────
  -- Estos son la prueba: cuándo y dónde se tomó la foto. Van en columnas
  -- porque son lo que valida la evidencia ante una auditoría.
  captured_at        timestamptz not null,
  latitude           double precision,
  longitude          double precision,

  -- ── Análisis por IA ──────────────────────────────────────────────────────
  ai_analysis        jsonb,
  ai_analyzed_at     timestamptz,

  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint inspection_media_client_id_unique unique (inspection_id, client_id)
);

create index inspection_media_inspection_idx on inspection_media (inspection_id, phase, sort_order);
create index inspection_media_pending_idx on inspection_media (upload_status)
  where upload_status in ('pending', 'failed');

create trigger inspection_media_set_updated_at
  before update on inspection_media
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Bitácora
--
-- Registro append-only de qué pasó y cuándo. Es lo que permite reconstruir
-- una inspección si alguien reclama, y lo que alimenta las métricas de
-- tiempos del panel admin.
-- ----------------------------------------------------------------------------

create table inspection_events (
  id            bigserial primary key,
  inspection_id uuid not null references inspections(id) on delete cascade,
  actor_id      uuid references profiles(id) on delete set null,

  -- started | paused | resumed | phase_completed | media_captured |
  -- ai_analysis | report_generated | cancelled | completed | reopened
  event         text not null,
  payload       jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now()
);

create index inspection_events_inspection_idx on inspection_events (inspection_id, occurred_at);

-- ----------------------------------------------------------------------------
-- RLS
--
-- Inspector : solo las suyas (asignadas o creadas por él), y solo puede
--             modificarlas mientras NO estén cerradas.
-- Admin     : todas las de su cuenta.
-- ----------------------------------------------------------------------------

alter table inspections        enable row level security;
alter table inspection_media   enable row level security;
alter table inspection_events  enable row level security;
alter table inspection_counters enable row level security;

-- El contador es interno: solo lo toca el trigger (SECURITY DEFINER).
-- Sin políticas, nadie más lo lee ni lo escribe.

create policy inspections_select on inspections
  for select using (
    deleted_at is null
    and (
      (company_account_id = current_company_account_id() and is_account_admin())
      or assigned_to = auth.uid()
      or created_by  = auth.uid()
      or is_super_admin()
    )
  );

create policy inspections_insert on inspections
  for insert with check (
    company_account_id = current_company_account_id()
    and (is_account_admin() or assigned_to = auth.uid() or created_by = auth.uid())
  );

-- Un inspector edita mientras la inspección esté viva. Una vez cerrada
-- (completed/cancelled) solo un admin puede tocarla.
create policy inspections_update_own on inspections
  for update using (
    (assigned_to = auth.uid() or created_by = auth.uid())
    and status not in ('completed', 'cancelled')
  )
  with check (company_account_id = current_company_account_id());

create policy inspections_admin_manage on inspections
  for all using (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  )
  with check (
    (company_account_id = current_company_account_id() and is_account_admin())
    or is_super_admin()
  );

-- La evidencia hereda el permiso de su inspección.
create policy inspection_media_access on inspection_media
  for all using (
    exists (
      select 1 from inspections i
      where i.id = inspection_media.inspection_id
        and i.deleted_at is null
        and (
          (i.company_account_id = current_company_account_id() and is_account_admin())
          or i.assigned_to = auth.uid()
          or i.created_by  = auth.uid()
          or is_super_admin()
        )
    )
  )
  with check (company_account_id = current_company_account_id());

create policy inspection_events_select on inspection_events
  for select using (
    exists (
      select 1 from inspections i
      where i.id = inspection_events.inspection_id
        and (
          (i.company_account_id = current_company_account_id() and is_account_admin())
          or i.assigned_to = auth.uid()
          or i.created_by  = auth.uid()
          or is_super_admin()
        )
    )
  );

-- La bitácora es append-only: se inserta, nunca se actualiza ni se borra.
create policy inspection_events_insert on inspection_events
  for insert with check (
    exists (
      select 1 from inspections i
      where i.id = inspection_events.inspection_id
        and i.company_account_id = current_company_account_id()
    )
  );
