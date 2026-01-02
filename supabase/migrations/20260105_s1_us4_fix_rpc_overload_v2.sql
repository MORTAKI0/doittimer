-- S1-US4: fix RPC overload ambiguity by keeping only no-arg versions.

drop function if exists public.get_active_session(uuid);
drop function if exists public.get_today_sessions(uuid);
drop function if exists public.get_active_session();
drop function if exists public.get_today_sessions();

create function public.get_active_session()
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
    and s.ended_at is null
  order by s.started_at desc
  limit 1;
$$;

create function public.get_today_sessions()
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
    and s.started_at >= (
      date_trunc('day', now() at time zone 'Africa/Casablanca')
      at time zone 'Africa/Casablanca'
    )
    and s.started_at < (
      date_trunc('day', now() at time zone 'Africa/Casablanca')
      at time zone 'Africa/Casablanca'
    ) + interval '1 day'
  order by s.started_at desc;
$$;

grant execute on function public.get_active_session() to authenticated;
grant execute on function public.get_today_sessions() to authenticated;
