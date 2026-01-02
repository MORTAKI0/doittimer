create or replace function public.start_session(p_user_id uuid)
returns public.sessions
language sql
as $$
  insert into public.sessions (user_id, started_at)
  values (p_user_id, now())
  returning *;
$$;

create or replace function public.stop_session(p_session_id uuid, p_user_id uuid)
returns setof public.sessions
language sql
as $$
  update public.sessions
  set ended_at = now(),
      duration_seconds = floor(extract(epoch from (now() - started_at)))::int
  where id = p_session_id
    and user_id = p_user_id
    and ended_at is null
  returning *;
$$;

create or replace function public.get_today_sessions(p_user_id uuid)
returns setof public.sessions
language sql
as $$
  select *
  from public.sessions
  where user_id = p_user_id
    and started_at >= (
      date_trunc('day', now() at time zone 'Africa/Casablanca')
      at time zone 'Africa/Casablanca'
    )
    and started_at < (
      date_trunc('day', now() at time zone 'Africa/Casablanca')
      at time zone 'Africa/Casablanca'
    ) + interval '1 day'
  order by started_at desc;
$$;

create or replace function public.get_active_session(p_user_id uuid)
returns setof public.sessions
language sql
as $$
  select *
  from public.sessions
  where user_id = p_user_id
    and ended_at is null
  order by started_at desc
  limit 1;
$$;

grant execute on function public.start_session(uuid) to authenticated;
grant execute on function public.stop_session(uuid, uuid) to authenticated;
grant execute on function public.get_today_sessions(uuid) to authenticated;
grant execute on function public.get_active_session(uuid) to authenticated;
