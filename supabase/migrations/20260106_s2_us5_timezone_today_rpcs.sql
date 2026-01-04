-- S2-US5: timezone-aware "today" RPCs.

create or replace function public.get_today_sessions()
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  task_title text
)
language sql
as $$
  with tz as (
    select coalesce(
      (select us.timezone from public.user_settings us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ) as value
  ),
  bounds as (
    select
      (date_trunc('day', now() at time zone (select value from tz))
        at time zone (select value from tz)) as start_at,
      (date_trunc('day', now() at time zone (select value from tz))
        at time zone (select value from tz)) + interval '1 day' as end_at
  )
  select
    s.id,
    s.user_id,
    s.task_id,
    s.started_at,
    s.ended_at,
    s.duration_seconds,
    t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.started_at >= (select start_at from bounds)
    and s.started_at < (select end_at from bounds)
  order by s.started_at desc;
$$;

create or replace function public.get_dashboard_today_stats()
returns table (
  focus_seconds integer,
  sessions_count integer,
  tasks_total integer,
  tasks_completed integer
)
language sql
as $$
  with tz as (
    select coalesce(
      (select us.timezone from public.user_settings us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ) as value
  ),
  bounds as (
    select
      (date_trunc('day', now() at time zone (select value from tz))
        at time zone (select value from tz)) as start_at,
      (date_trunc('day', now() at time zone (select value from tz))
        at time zone (select value from tz)) + interval '1 day' as end_at
  ),
  sessions_today as (
    select s.*
    from public.sessions s
    where s.user_id = auth.uid()
      and s.started_at >= (select start_at from bounds)
      and s.started_at < (select end_at from bounds)
  ),
  tasks_user as (
    select t.*
    from public.tasks t
    where t.user_id = auth.uid()
  )
  select
    coalesce(sum(coalesce(s.duration_seconds, 0)), 0)::int as focus_seconds,
    count(s.id)::int as sessions_count,
    (select count(*) from tasks_user)::int as tasks_total,
    (select count(*) from tasks_user where completed is true)::int as tasks_completed
  from sessions_today s;
$$;

grant execute on function public.get_today_sessions() to authenticated;
grant execute on function public.get_dashboard_today_stats() to authenticated;
