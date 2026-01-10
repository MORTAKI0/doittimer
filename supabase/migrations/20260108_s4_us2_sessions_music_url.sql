-- S4-US2: add music_url to sessions and include it in session RPCs.

alter table if exists public.sessions
  add column if not exists music_url text;

do $$
begin
  if to_regclass('public.sessions') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'sessions_music_url_len_chk'
        and conrelid = 'public.sessions'::regclass
    ) then
      alter table public.sessions
        add constraint sessions_music_url_len_chk
        check (music_url is null or char_length(music_url) <= 1000);
    end if;
  end if;
end $$;

create or replace function public.get_active_session()
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  music_url text,
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
    s.music_url,
    t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.ended_at is null
  order by s.started_at desc
  limit 1;
$$;

create or replace function public.get_today_sessions()
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  music_url text,
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
    t.title as task_title
  from public.sessions s
  left join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.started_at >= (select start_at from bounds)
    and s.started_at < (select end_at from bounds)
  order by s.started_at desc;
$$;

create or replace function public.start_session(p_task_id uuid default null)
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  music_url text,
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
    insert into public.sessions (user_id, task_id, started_at)
    values (auth.uid(), (select id from resolved_task), now())
    returning *
  )
  select
    inserted.id,
    inserted.user_id,
    inserted.task_id,
    inserted.started_at,
    inserted.ended_at,
    inserted.duration_seconds,
    inserted.music_url,
    (select title from resolved_task) as task_title
  from inserted;
$$;

grant execute on function public.get_active_session() to authenticated;
grant execute on function public.get_today_sessions() to authenticated;
grant execute on function public.start_session(uuid) to authenticated;
