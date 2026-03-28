alter table public.tasks
  add column if not exists description text;

alter table public.tasks
  add column if not exists priority smallint default 4;

update public.tasks
set priority = 4
where priority is null;

alter table public.tasks
  alter column priority set default 4;

alter table public.tasks
  alter column priority set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_priority_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_priority_check
      check (priority between 1 and 4);
  end if;
end $$;

-- Rollback order if needed:
-- alter table public.tasks drop constraint if exists tasks_priority_check;
-- alter table public.tasks drop column if exists priority;
-- alter table public.tasks drop column if exists description;
