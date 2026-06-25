create table if not exists public.horarios (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete restrict,
  profesor_id uuid not null references public.usuarios(id) on delete cascade,
  dia text not null,
  hora_inicio time not null,
  hora_fin time not null,
  sala text null,
  created_at timestamptz not null default now()
);

create index if not exists horarios_profesor_id_idx on public.horarios (profesor_id);
create index if not exists horarios_curso_id_idx on public.horarios (curso_id);

alter table public.horarios enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'horarios' and policyname = 'horarios_select'
  ) then
    create policy horarios_select on public.horarios
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'horarios' and policyname = 'horarios_insert'
  ) then
    create policy horarios_insert on public.horarios
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'horarios' and policyname = 'horarios_update'
  ) then
    create policy horarios_update on public.horarios
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'horarios' and policyname = 'horarios_delete'
  ) then
    create policy horarios_delete on public.horarios
      for delete
      using (true);
  end if;
end $$;

