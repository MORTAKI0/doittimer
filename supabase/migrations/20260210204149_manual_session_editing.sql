alter table if exists public.sessions
  add column if not exists edited_at timestamptz,
  add column if not exists edit_reason text;

drop function if exists public.get_today_sessions();

create function public.get_today_sessions()
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  music_url text,
  edited_at timestamptz,
  edit_reason text,
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
    s.music_url,
    s.edited_at,
    s.edit_reason,
    t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.started_at >= (select start_at from bounds)
    and s.started_at < (select end_at from bounds)
  order by s.started_at desc;
$$;

create or replace function public.session_edit(
  p_session_id uuid,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null,
  p_task_id uuid default null,
  p_edit_reason text default null
)
returns public.sessions
language plpgsql
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_new_started_at timestamptz;
  v_new_ended_at timestamptz;
  v_new_task_id uuid;
  v_duration_seconds integer;
begin
  select s.*
    into v_session
  from public.sessions as s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  if v_session.user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  if v_session.ended_at is null then
    raise exception 'cannot edit active session';
  end if;

  v_new_started_at := coalesce(p_started_at, v_session.started_at);
  v_new_ended_at := coalesce(p_ended_at, v_session.ended_at);

  if v_new_ended_at < v_new_started_at then
    raise exception 'ended_at must be greater than or equal to started_at';
  end if;

  v_duration_seconds := floor(extract(epoch from (v_new_ended_at - v_new_started_at)))::int;

  if v_duration_seconds > 43200 then
    raise exception 'duration exceeds 12 hours';
  end if;

  if p_task_id is null then
    v_new_task_id := v_session.task_id;
  else
    select t.id
      into v_new_task_id
    from public.tasks as t
    where t.id = p_task_id
      and t.user_id = auth.uid();

    if v_new_task_id is null then
      raise exception 'invalid task_id';
    end if;
  end if;

  update public.sessions as s
  set started_at = v_new_started_at,
      ended_at = v_new_ended_at,
      task_id = v_new_task_id,
      duration_seconds = v_duration_seconds,
      edited_at = now(),
      edit_reason = coalesce(p_edit_reason, s.edit_reason)
  where s.id = v_session.id
  returning s.* into v_session;

  return v_session;
end;
$$;

grant execute on function public.get_today_sessions() to authenticated;
grant execute on function public.session_edit(uuid, timestamptz, timestamptz, uuid, text) to authenticated;
