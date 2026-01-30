-- S2026-02 Story 1: fix pomodoro_skip_phase transition logic.

create or replace function public.pomodoro_skip_phase(p_session_id uuid)
returns public.sessions
language plpgsql
as $$
declare
  v_phase text;
  v_cycle_count integer;
  v_long_every integer;
  v_next_cycle_count integer;
  v_next_phase text;
  v_row public.sessions%rowtype;
begin
  select s.pomodoro_phase, s.pomodoro_cycle_count
    into v_phase, v_cycle_count
  from public.sessions as s
  where s.id = p_session_id
    and s.user_id = auth.uid()
    and s.ended_at is null
  for update;

  if not found then
    return null;
  end if;

  if v_phase is null then
    v_next_phase := 'work';
    v_next_cycle_count := coalesce(v_cycle_count, 0);
  elsif v_phase = 'work' then
    v_next_cycle_count := coalesce(v_cycle_count, 0) + 1;

    select us.pomodoro_long_break_every
      into v_long_every
    from public.user_settings us
    where us.user_id = auth.uid();

    if v_long_every is null or v_long_every <= 0 then
      v_long_every := 4;
    end if;

    if (v_next_cycle_count % v_long_every) = 0 then
      v_next_phase := 'long_break';
    else
      v_next_phase := 'short_break';
    end if;
  else
    v_next_phase := 'work';
    v_next_cycle_count := coalesce(v_cycle_count, 0);
  end if;

  update public.sessions as s
  set pomodoro_phase = v_next_phase,
      pomodoro_phase_started_at = now(),
      pomodoro_cycle_count = v_next_cycle_count,
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where s.id = p_session_id
    and s.user_id = auth.uid()
    and s.ended_at is null
  returning s.* into v_row;

  return v_row;
end;
$$;

grant execute on function public.pomodoro_skip_phase(uuid) to authenticated;
