-- S4-US1: task-level Pomodoro overrides (nullable).
alter table if exists public.tasks
  add column if not exists pomodoro_work_minutes integer,
  add column if not exists pomodoro_short_break_minutes integer,
  add column if not exists pomodoro_long_break_minutes integer,
  add column if not exists pomodoro_long_break_every integer;

do $$
begin
  if to_regclass('public.tasks') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'tasks_pomodoro_work_minutes_chk'
        and conrelid = 'public.tasks'::regclass
    ) then
      alter table public.tasks
        add constraint tasks_pomodoro_work_minutes_chk
        check (pomodoro_work_minutes is null or (pomodoro_work_minutes between 1 and 240));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'tasks_pomodoro_short_break_minutes_chk'
        and conrelid = 'public.tasks'::regclass
    ) then
      alter table public.tasks
        add constraint tasks_pomodoro_short_break_minutes_chk
        check (pomodoro_short_break_minutes is null or (pomodoro_short_break_minutes between 1 and 60));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'tasks_pomodoro_long_break_minutes_chk'
        and conrelid = 'public.tasks'::regclass
    ) then
      alter table public.tasks
        add constraint tasks_pomodoro_long_break_minutes_chk
        check (pomodoro_long_break_minutes is null or (pomodoro_long_break_minutes between 1 and 120));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'tasks_pomodoro_long_break_every_chk'
        and conrelid = 'public.tasks'::regclass
    ) then
      alter table public.tasks
        add constraint tasks_pomodoro_long_break_every_chk
        check (pomodoro_long_break_every is null or (pomodoro_long_break_every between 1 and 12));
    end if;
  end if;
end $$;
