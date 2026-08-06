-- ============================================================
-- Wedding Guest Tracker - Initial Schema
-- ============================================================

-- ============================================================
-- Table: bodas (wedding events)
-- ============================================================
create table bodas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha date not null,
  creado_por uuid not null references auth.users(id) on delete cascade,
  creado_at timestamptz not null default now()
);

alter table bodas enable row level security;

create policy "usuarios_ven_sus_bodas"
  on bodas for select
  using (
    creado_por = auth.uid()
    or id in (select boda_id from boda_colaboradores where usuario_id = auth.uid())
  );

create policy "creador_administra_su_boda"
  on bodas for all
  using (creado_por = auth.uid())
  with check (creado_por = auth.uid());

-- ============================================================
-- Table: boda_colaboradores (multi-user access: novios, madres, coordinadora)
-- ============================================================
create table boda_colaboradores (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references bodas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('novio', 'familiar', 'coordinadora')),
  creado_at timestamptz not null default now(),
  unique (boda_id, usuario_id)
);

alter table boda_colaboradores enable row level security;

create policy "colaboradores_ven_su_boda"
  on boda_colaboradores for select
  using (
    usuario_id = auth.uid()
    or boda_id in (select id from bodas where creado_por = auth.uid())
  );

create policy "creador_administra_colaboradores"
  on boda_colaboradores for insert
  with check (boda_id in (select id from bodas where creado_por = auth.uid()));

create policy "creador_elimina_colaboradores"
  on boda_colaboradores for delete
  using (boda_id in (select id from bodas where creado_por = auth.uid()));

-- Helper: bodas a las que un usuario tiene acceso (creador o colaborador)
create or replace function bodas_accesibles(uid uuid)
returns setof uuid
language sql
security definer
stable
as $$
  select id from bodas where creado_por = uid
  union
  select boda_id from boda_colaboradores where usuario_id = uid
$$;

-- ============================================================
-- Table: invitados
-- ============================================================
create table invitados (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references bodas(id) on delete cascade,

  -- Datos básicos
  nombre text not null,
  email text not null,
  telefono text,

  -- Magic Link + PIN auth
  magic_token uuid unique not null default gen_random_uuid(),
  pin_hash text not null,
  token_expira_at timestamptz not null default (now() + interval '30 days'),

  -- Rate limiting del PIN
  pin_intentos int not null default 0,
  pin_bloqueado_hasta timestamptz,

  -- Límite de acompañantes ADICIONALES (sin contar al invitado principal)
  -- ej: max_acompanantes = 1 permite al invitado + 1 persona más (2 lugares en total)
  max_acompanantes int not null default 1,

  -- Estado (siempre reflejando la última confirmación registrada)
  estado text not null default 'pending'
    check (estado in ('pending', 'confirmed', 'declined', 'attended', 'no_show')),
  confirmado_at timestamptz,

  -- Última respuesta registrada (desnormalizado desde `confirmaciones` para lectura rápida)
  restricciones_dieteticas text,
  num_acompanantes int not null default 0,
  comentarios text,

  -- Asignación física (opcional, se llena después)
  mesa_asignada int,
  asiento_asignado int,

  -- Audit
  creado_por uuid not null references auth.users(id),
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),

  constraint acompanantes_dentro_del_limite check (num_acompanantes <= max_acompanantes)
);

create index idx_invitados_boda_id on invitados(boda_id);
create index idx_invitados_magic_token on invitados(magic_token);
create index idx_invitados_estado on invitados(estado);

alter table invitados enable row level security;

create policy "colaboradores_administran_invitados"
  on invitados for all
  using (boda_id in (select bodas_accesibles(auth.uid())))
  with check (boda_id in (select bodas_accesibles(auth.uid())));

-- Nota: el flujo público de invitados (validar-token, verificar-pin, confirmar)
-- NO usa las credenciales de usuario de Supabase Auth; usa la service_role key
-- desde API routes server-side, que ignora RLS por diseño. RLS aquí protege
-- únicamente el acceso desde el dashboard de novios/colaboradores.

-- ============================================================
-- Table: confirmaciones (event sourcing — un registro por cada respuesta enviada)
-- ============================================================
create table confirmaciones (
  id uuid primary key default gen_random_uuid(),
  invitado_id uuid not null references invitados(id) on delete cascade,

  respuesta text not null check (respuesta in ('confirmed', 'declined')),
  restricciones_dieteticas text,
  num_acompanantes int not null default 0,
  comentarios text,

  -- Audit
  ip_address inet,
  user_agent text,
  confirmado_at timestamptz not null default now()
);

create index idx_confirmaciones_invitado_id on confirmaciones(invitado_id);

alter table confirmaciones enable row level security;

create policy "colaboradores_ven_confirmaciones"
  on confirmaciones for select
  using (
    invitado_id in (
      select id from invitados where boda_id in (select bodas_accesibles(auth.uid()))
    )
  );

-- ============================================================
-- Table: invitados_historial (audit log inmutable de todos los cambios)
-- ============================================================
create table invitados_historial (
  id uuid primary key default gen_random_uuid(),
  invitado_id uuid not null references invitados(id) on delete cascade,
  evento text not null, -- 'created', 'confirmed', 'declined', 'pin_intento_fallido', 'pin_bloqueado', 'reenviado', 'editado'
  cambios jsonb,
  ip_address inet,
  user_agent text,
  creado_at timestamptz not null default now()
);

create index idx_historial_invitado_id on invitados_historial(invitado_id);
create index idx_historial_creado_at on invitados_historial(creado_at);

alter table invitados_historial enable row level security;

create policy "colaboradores_ven_historial"
  on invitados_historial for select
  using (
    invitado_id in (
      select id from invitados where boda_id in (select bodas_accesibles(auth.uid()))
    )
  );

-- ============================================================
-- Trigger: registrar automáticamente la creación de un invitado
-- ============================================================
create or replace function log_invitado_creado()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into invitados_historial (invitado_id, evento, cambios)
  values (new.id, 'created', jsonb_build_object(
    'nombre', new.nombre,
    'email', new.email,
    'max_acompanantes', new.max_acompanantes
  ));
  return new;
end;
$$;

create trigger trg_invitado_creado
  after insert on invitados
  for each row execute function log_invitado_creado();

-- ============================================================
-- Trigger: mantener actualizado_at
-- ============================================================
create or replace function set_actualizado_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_at = now();
  return new;
end;
$$;

create trigger trg_invitados_actualizado_at
  before update on invitados
  for each row execute function set_actualizado_at();
