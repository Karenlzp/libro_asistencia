-- Tabla recomendada para persistir la auditoria del frontend en Supabase.
-- Ejecutar en el SQL Editor del proyecto cuando quieran pasar de modo local a persistencia real.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references public.usuarios(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity text not null,
  entity_id text null,
  field_name text null,
  old_value text null,
  new_value text null,
  metadata jsonb null,
  source text not null default 'app',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.rol = 'admin'
  )
);

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
on public.audit_logs
for insert
to authenticated
with check (auth.uid() is not null);
