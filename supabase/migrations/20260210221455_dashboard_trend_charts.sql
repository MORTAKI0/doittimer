create or replace function public.get_dashboard_trends(p_days integer)
returns table (
  day date,
  focus_minutes integer,
  completed_tasks integer,
  on_time_rate double precision
)
language sql
set search_path = public
as $$
  with bounds as (
    select
      (now() at time zone 'utc')::date as today_day,
      ((now() at time zone 'utc')::date - (greatest(p_days, 1) - 1))::date as start_day
  ),
  days as (
    select
      generate_series(
        (select start_day from bounds),
        (select today_day from bounds),
        interval '1 day'
      )::date as day
  ),
  session_totals as (
    select
      date_trunc('day', s.started_at at time zone 'utc')::date as day,
      floor(coalesce(sum(s.duration_seconds), 0) / 60.0)::int as focus_minutes
    from public.sessions as s
    where s.user_id = auth.uid()
      and s.ended_at is not null
      and s.started_at >= (((select start_day from bounds))::timestamp at time zone 'utc')
      and s.started_at < ((((select today_day from bounds) + 1))::timestamp at time zone 'utc')
    group by 1
  ),
  completion_totals as (
    select
      date_trunc('day', t.completed_at at time zone 'utc')::date as day,
      count(*)::int as completed_tasks,
      count(*) filter (where t.scheduled_for is not null)::int as scheduled_completed_tasks,
      count(*) filter (
        where t.scheduled_for is not null
          and (t.completed_at at time zone 'utc')::date <= t.scheduled_for
      )::int as on_time_completed_tasks
    from public.tasks as t
    where t.user_id = auth.uid()
      and t.completed_at is not null
      and t.completed_at >= (((select start_day from bounds))::timestamp at time zone 'utc')
      and t.completed_at < ((((select today_day from bounds) + 1))::timestamp at time zone 'utc')
    group by 1
  )
  select
    d.day,
    coalesce(s.focus_minutes, 0)::int as focus_minutes,
    coalesce(c.completed_tasks, 0)::int as completed_tasks,
    case
      when coalesce(c.scheduled_completed_tasks, 0) = 0 then null
      else c.on_time_completed_tasks::double precision / c.scheduled_completed_tasks::double precision
    end as on_time_rate
  from days as d
  left join session_totals as s on s.day = d.day
  left join completion_totals as c on c.day = d.day
  order by d.day asc;
$$;

revoke all on function public.get_dashboard_trends(integer) from public;
revoke all on function public.get_dashboard_trends(integer) from anon;
grant execute on function public.get_dashboard_trends(integer) to authenticated;

create index if not exists idx_sessions_user_started_at
  on public.sessions (user_id, started_at);

create index if not exists idx_tasks_user_completed_at
  on public.tasks (user_id, completed_at);
