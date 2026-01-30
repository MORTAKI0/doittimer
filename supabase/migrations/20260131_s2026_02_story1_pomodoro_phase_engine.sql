-- S2026-02 Story 1: pomodoro phase engine behavior (transition + pause/resume).

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
      pomodoro_paused_at = coalesce(pomodoro_paused_at, now())
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
      pomodoro_phase_started_at = case
        when pomodoro_paused_at is null
          then coalesce(pomodoro_phase_started_at, now())
        else coalesce(pomodoro_phase_started_at, now()) + (now() - pomodoro_paused_at)
      end,
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
  with effective_settings as (
    select
      s.id,
      s.pomodoro_phase,
      s.pomodoro_cycle_count,
      coalesce(t.pomodoro_long_break_every, us.pomodoro_long_break_every, 4) as long_every
    from public.sessions s
    left join public.tasks t
      on t.id = s.task_id
      and t.user_id = auth.uid()
    left join public.user_settings us
      on us.user_id = auth.uid()
    where s.id = p_session_id
      and s.user_id = auth.uid()
      and s.ended_at is null
  )
  update public.sessions s
  set pomodoro_phase = case
        when coalesce(effective_settings.pomodoro_phase, 'work') = 'work'
          then case
            when ((effective_settings.pomodoro_cycle_count + 1)
              % effective_settings.long_every) = 0
              then 'long_break'
              else 'short_break'
          end
        else 'work'
      end,
      pomodoro_cycle_count = case
        when coalesce(effective_settings.pomodoro_phase, 'work') = 'work'
          then effective_settings.pomodoro_cycle_count + 1
        else effective_settings.pomodoro_cycle_count
      end,
      pomodoro_phase_started_at = now(),
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  from effective_settings
  where s.id = effective_settings.id
  returning s.*;
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
