-- S2026-02 Story 1: add pomodoro v2 flag, constraints, and RPC skeletons.

alter table if exists public.user_settings
  add column if not exists pomodoro_v2_enabled boolean not null default false;

do $$
begin
  if to_regclass('public.sessions') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'sessions_pomodoro_phase_chk'
        and conrelid = 'public.sessions'::regclass
    ) then
      alter table public.sessions
        add constraint sessions_pomodoro_phase_chk
        check (
          pomodoro_phase is null
          or pomodoro_phase in ('work', 'short_break', 'long_break')
        );
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'sessions_pomodoro_cycle_count_chk'
        and conrelid = 'public.sessions'::regclass
    ) then
      alter table public.sessions
        add constraint sessions_pomodoro_cycle_count_chk
        check (pomodoro_cycle_count >= 0);
    end if;
  end if;
end $$;

create or replace function public.pomodoro_init(p_session_id uuid)
returns public.sessions
language sql
as $$
  update public.sessions
  set pomodoro_phase = coalesce(pomodoro_phase, 'work'),
      pomodoro_phase_started_at = coalesce(pomodoro_phase_started_at, now()),
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where id = p_session_id
    and user_id = auth.uid()
    and ended_at is null
  returning *;
$$;

create or replace function public.pomodoro_pause(p_session_id uuid)
returns public.sessions
language sql
as $$
  update public.sessions
  set pomodoro_is_paused = true,
      pomodoro_paused_at = now()
  where id = p_session_id
    and user_id = auth.uid()
    and ended_at is null
  returning *;
$$;

create or replace function public.pomodoro_resume(p_session_id uuid)
returns public.sessions
language sql
as $$
  update public.sessions
  set pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where id = p_session_id
    and user_id = auth.uid()
    and ended_at is null
  returning *;
$$;

create or replace function public.pomodoro_skip_phase(p_session_id uuid)
returns public.sessions
language sql
as $$
  update public.sessions
  set pomodoro_phase_started_at = now(),
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where id = p_session_id
    and user_id = auth.uid()
    and ended_at is null
  returning *;
$$;

create or replace function public.pomodoro_restart_phase(p_session_id uuid)
returns public.sessions
language sql
as $$
  update public.sessions
  set pomodoro_phase_started_at = now(),
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where id = p_session_id
    and user_id = auth.uid()
    and ended_at is null
  returning *;
$$;

grant execute on function public.pomodoro_init(uuid) to authenticated;
grant execute on function public.pomodoro_pause(uuid) to authenticated;
grant execute on function public.pomodoro_resume(uuid) to authenticated;
grant execute on function public.pomodoro_skip_phase(uuid) to authenticated;
grant execute on function public.pomodoro_restart_phase(uuid) to authenticated;
