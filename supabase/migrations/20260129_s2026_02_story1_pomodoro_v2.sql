-- S2026-02 Story 1: mirror current Supabase state (sessions columns + live RPCs).

alter table if exists public.sessions
  add column if not exists pomodoro_phase text,
  add column if not exists pomodoro_phase_started_at timestamptz,
  add column if not exists pomodoro_is_paused boolean not null default false,
  add column if not exists pomodoro_paused_at timestamptz,
  add column if not exists pomodoro_cycle_count int not null default 0;

CREATE OR REPLACE FUNCTION public.get_active_session_v2()
 RETURNS TABLE(id uuid, user_id uuid, task_id uuid, started_at timestamp with time zone, ended_at timestamp with time zone, duration_seconds integer, music_url text, pomodoro_phase text, pomodoro_phase_started_at timestamp with time zone, pomodoro_is_paused boolean, pomodoro_paused_at timestamp with time zone, pomodoro_cycle_count integer, task_title text)
 LANGUAGE sql
AS $function$
  select
    s.id,
    s.user_id,
    s.task_id,
    s.started_at,
    s.ended_at,
    s.duration_seconds,
    s.music_url,
    s.pomodoro_phase,
    s.pomodoro_phase_started_at,
    s.pomodoro_is_paused,
    s.pomodoro_paused_at,
    s.pomodoro_cycle_count,
    t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.ended_at is null
  order by s.started_at desc
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_user_settings(p_timezone text, p_default_task_id uuid, p_pomodoro_work_minutes integer, p_pomodoro_short_break_minutes integer, p_pomodoro_long_break_minutes integer, p_pomodoro_long_break_every integer)
 RETURNS TABLE(timezone text, default_task_id uuid, pomodoro_work_minutes integer, pomodoro_short_break_minutes integer, pomodoro_long_break_minutes integer, pomodoro_long_break_every integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_settings as s (
    user_id,
    timezone,
    default_task_id,
    pomodoro_work_minutes,
    pomodoro_short_break_minutes,
    pomodoro_long_break_minutes,
    pomodoro_long_break_every,
    updated_at
  )
  values (
    auth.uid(),
    p_timezone,
    p_default_task_id,
    p_pomodoro_work_minutes,
    p_pomodoro_short_break_minutes,
    p_pomodoro_long_break_minutes,
    p_pomodoro_long_break_every,
    now()
  )
  on conflict (user_id) do update
    set timezone = excluded.timezone,
        default_task_id = excluded.default_task_id,
        pomodoro_work_minutes = excluded.pomodoro_work_minutes,
        pomodoro_short_break_minutes = excluded.pomodoro_short_break_minutes,
        pomodoro_long_break_minutes = excluded.pomodoro_long_break_minutes,
        pomodoro_long_break_every = excluded.pomodoro_long_break_every,
        updated_at = now();

  return query
  select
    s.timezone,
    s.default_task_id,
    s.pomodoro_work_minutes,
    s.pomodoro_short_break_minutes,
    s.pomodoro_long_break_minutes,
    s.pomodoro_long_break_every
  from public.user_settings s
  where s.user_id = auth.uid();
end;
$function$;
