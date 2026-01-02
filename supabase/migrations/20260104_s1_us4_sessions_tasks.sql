-- S1-US4: attach sessions to tasks and expose task title in session queries.

create or replace function public.start_session(p_task_id uuid default null)
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz,
  task_title text
)
language sql
as $$
  with resolved_task as (
    select t.id, t.title
    from public.tasks t
    where t.id = p_task_id
      and t.user_id = auth.uid()
  ),
  inserted as (
    insert into public.sessions (user_id, task_id, started_at, created_at)
    values (auth.uid(), (select id from resolved_task), now(), now())
    returning *
  )
  select inserted.*, (select title from resolved_task) as task_title
  from inserted;
$$;

create or replace function public.get_active_session(p_user_id uuid default null)
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz,
  task_title text
)
language sql
as $$
  select s.*, t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.ended_at is null
  order by s.started_at desc
  limit 1;
$$;

create or replace function public.get_today_sessions(p_user_id uuid default null)
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz,
  task_title text
)
language sql
as $$
  select s.*, t.title as task_title
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

grant execute on function public.start_session(uuid) to authenticated;
grant execute on function public.get_active_session(uuid) to authenticated;
grant execute on function public.get_today_sessions(uuid) to authenticated;
