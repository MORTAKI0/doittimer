-- S4: Replace bidirectional Notion sync with one-way Notion -> app import.
-- Idempotent migration for encrypted connection storage and imported record metadata.

create extension if not exists pgcrypto;

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

alter table public.projects
  add column if not exists source text not null default 'local',
  add column if not exists read_only boolean not null default false;

alter table public.tasks
  add column if not exists source text not null default 'local',
  add column if not exists read_only boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_source_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_source_check
      check (source in ('local', 'notion'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_source_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_source_check
      check (source in ('local', 'notion'));
  end if;
end $$;

create table if not exists public.notion_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notion_token text null,
  notion_token_encrypted text null,
  notion_database_id text null,
  workspace_name text null,
  schema_version integer not null default 1,
  last_synced_at timestamptz null,
  last_status text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notion_connections
  add column if not exists notion_token text null,
  add column if not exists notion_token_encrypted text null,
  add column if not exists notion_database_id text null,
  add column if not exists workspace_name text null,
  add column if not exists schema_version integer not null default 1,
  add column if not exists last_synced_at timestamptz null,
  add column if not exists last_status text null,
  add column if not exists last_error text null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.notion_connections
  alter column notion_token drop not null,
  alter column notion_database_id drop not null;

drop trigger if exists set_notion_connections_updated_at on public.notion_connections;
create trigger set_notion_connections_updated_at
before update on public.notion_connections
for each row
execute function public.set_updated_at();

create table if not exists public.notion_project_map (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  notion_project_key text null,
  notion_page_id text null,
  last_pulled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.notion_project_map
  add column if not exists notion_project_key text null,
  add column if not exists notion_page_id text null,
  add column if not exists last_pulled_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_notion_project_map_updated_at on public.notion_project_map;
create trigger set_notion_project_map_updated_at
before update on public.notion_project_map
for each row
execute function public.set_updated_at();

create unique index if not exists idx_notion_project_map_user_project_key
  on public.notion_project_map (user_id, notion_project_key)
  where notion_project_key is not null;

create table if not exists public.notion_task_map (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  notion_page_id text not null,
  last_pulled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.notion_task_map
  add column if not exists notion_page_id text null,
  add column if not exists last_pulled_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_notion_task_map_updated_at on public.notion_task_map;
create trigger set_notion_task_map_updated_at
before update on public.notion_task_map
for each row
execute function public.set_updated_at();

create unique index if not exists idx_notion_task_map_user_page
  on public.notion_task_map (user_id, notion_page_id);

create table if not exists public.notion_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  summary jsonb null,
  error text null,
  created_at timestamptz not null default now()
);

alter table public.notion_sync_runs
  add column if not exists status text not null default 'success',
  add column if not exists summary jsonb null,
  add column if not exists error text null,
  add column if not exists created_at timestamptz not null default now();

alter table public.notion_connections enable row level security;
alter table public.notion_project_map enable row level security;
alter table public.notion_task_map enable row level security;
alter table public.notion_sync_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notion_connections' and policyname = 'notion_connections_owner_all'
  ) then
    create policy notion_connections_owner_all on public.notion_connections
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notion_project_map' and policyname = 'notion_project_map_owner_all'
  ) then
    create policy notion_project_map_owner_all on public.notion_project_map
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notion_task_map' and policyname = 'notion_task_map_owner_all'
  ) then
    create policy notion_task_map_owner_all on public.notion_task_map
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notion_sync_runs' and policyname = 'notion_sync_runs_owner_all'
  ) then
    create policy notion_sync_runs_owner_all on public.notion_sync_runs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
