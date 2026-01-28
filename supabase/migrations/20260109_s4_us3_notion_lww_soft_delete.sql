-- S4-US3: Notion LWW bidirectional sync + soft-delete support.
-- Idempotent migration with safe guards.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'archived_at'
  ) then
    alter table public.tasks add column archived_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'updated_at'
  ) then
    alter table public.tasks add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'archived_at'
  ) then
    alter table public.projects add column archived_at timestamptz null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'updated_at'
  ) then
    alter table public.projects add column updated_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'set_updated_at'
  ) then
    create function public.set_updated_at()
    returns trigger
    language plpgsql
    as $func$
    begin
      new.updated_at = now();
      return new;
    end;
    $func$;
  end if;
end $$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.notion_task_map
  add column if not exists last_pulled_at timestamptz null;

alter table public.notion_project_map
  add column if not exists last_pulled_at timestamptz null;

create index if not exists idx_tasks_archived_at on public.tasks (archived_at);
create index if not exists idx_projects_archived_at on public.projects (archived_at);
