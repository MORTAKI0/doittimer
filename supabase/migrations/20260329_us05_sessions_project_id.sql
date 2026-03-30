-- US-05: add project context to sessions so time tracking can run from projects without a task.

alter table if exists public.sessions
  add column if not exists project_id uuid;

-- Backfill task-linked history so session project context stays stable
-- even if tasks are moved between projects later.
update public.sessions as sessions
set project_id = tasks.project_id
from public.tasks as tasks
where sessions.task_id = tasks.id
  and sessions.project_id is null
  and tasks.project_id is not null;

do $$
begin
  if to_regclass('public.sessions') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'sessions_project_id_fkey'
        and conrelid = 'public.sessions'::regclass
    ) then
      alter table public.sessions
        add constraint sessions_project_id_fkey
        foreign key (project_id)
        references public.projects(id)
        on delete set null;
    end if;
  end if;
end $$;
