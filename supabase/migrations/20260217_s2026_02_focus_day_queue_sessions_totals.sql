-- S2026-02: Focus day queue, sessions by day, and dashboard work totals.

alter table if exists public.task_queue_items
  add column if not exists queue_date date;

update public.task_queue_items as q
set queue_date = (
  (
    now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = q.user_id),
      'Africa/Casablanca'
    )
  )::date
)
where q.queue_date is null;

alter table if exists public.task_queue_items
  alter column queue_date set not null;

drop index if exists idx_task_queue_items_user_sort_unique;

alter table public.task_queue_items
  drop constraint if exists task_queue_items_pkey;

alter table public.task_queue_items
  add constraint task_queue_items_pkey
  primary key (user_id, queue_date, task_id);

create index if not exists idx_task_queue_items_user_date_sort
  on public.task_queue_items (user_id, queue_date, sort_order);

create unique index if not exists idx_task_queue_items_user_date_sort_unique
  on public.task_queue_items (user_id, queue_date, sort_order);

create index if not exists idx_task_queue_items_user_queue_date
  on public.task_queue_items (user_id, queue_date);

create or replace function public.task_queue_list(p_queue_date date default null)
returns table (
  task_id uuid,
  queue_date date,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language plpgsql
as $$
declare
  v_queue_date date;
begin
  if p_queue_date is not null then
    v_queue_date := p_queue_date;
  else
    select (now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ))::date
    into v_queue_date;
  end if;

  return query
  select q.task_id, q.queue_date, q.sort_order, q.created_at,
         t.title, t.completed, t.project_id, t.archived_at
  from public.task_queue_items as q
  join public.tasks as t on t.id = q.task_id
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date
    and t.user_id = auth.uid()
  order by q.sort_order asc, q.created_at asc;
end;
$$;

create or replace function public.task_queue_add(
  p_task_id uuid,
  p_queue_date date default null
)
returns table (
  task_id uuid,
  queue_date date,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language plpgsql
as $$
declare
  v_count integer;
  v_next integer;
  v_queue_date date;
begin
  if not exists (
    select 1 from public.tasks as t
    where t.id = p_task_id
      and t.user_id = auth.uid()
      and t.archived_at is null
  ) then
    raise exception 'task_not_found';
  end if;

  if p_queue_date is not null then
    v_queue_date := p_queue_date;
  else
    select (now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ))::date
    into v_queue_date;
  end if;

  select count(*) into v_count
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date;

  if v_count >= 7 then
    raise exception 'queue_full';
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_next
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date;

  insert into public.task_queue_items(user_id, task_id, queue_date, sort_order)
  values (auth.uid(), p_task_id, v_queue_date, v_next)
  on conflict (user_id, queue_date, task_id) do nothing;

  return query
  select * from public.task_queue_list(v_queue_date);
end;
$$;

create or replace function public.task_queue_remove(
  p_task_id uuid,
  p_queue_date date default null
)
returns table (
  task_id uuid,
  queue_date date,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language plpgsql
as $$
declare
  v_order integer;
  v_queue_date date;
begin
  if p_queue_date is not null then
    v_queue_date := p_queue_date;
  else
    select (now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ))::date
    into v_queue_date;
  end if;

  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  delete from public.task_queue_items
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = sort_order - 1
  where user_id = auth.uid()
    and queue_date = v_queue_date
    and sort_order > v_order;

  return query select * from public.task_queue_list(v_queue_date);
end;
$$;

create or replace function public.task_queue_move_up(
  p_task_id uuid,
  p_queue_date date default null
)
returns table (
  task_id uuid,
  queue_date date,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language plpgsql
as $$
declare
  v_order integer;
  v_neighbor_task uuid;
  v_neighbor_order integer;
  v_temp integer;
  v_queue_date date;
begin
  if p_queue_date is not null then
    v_queue_date := p_queue_date;
  else
    select (now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ))::date
    into v_queue_date;
  end if;

  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select task_id, sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items
  where user_id = auth.uid()
    and queue_date = v_queue_date
    and sort_order < v_order
  order by sort_order desc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_temp
  from public.task_queue_items
  where user_id = auth.uid()
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_temp
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_order
  where user_id = auth.uid()
    and task_id = v_neighbor_task
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_neighbor_order
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date;

  return query select * from public.task_queue_list(v_queue_date);
end;
$$;

create or replace function public.task_queue_move_down(
  p_task_id uuid,
  p_queue_date date default null
)
returns table (
  task_id uuid,
  queue_date date,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language plpgsql
as $$
declare
  v_order integer;
  v_neighbor_task uuid;
  v_neighbor_order integer;
  v_temp integer;
  v_queue_date date;
begin
  if p_queue_date is not null then
    v_queue_date := p_queue_date;
  else
    select (now() at time zone coalesce(
      (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
      'Africa/Casablanca'
    ))::date
    into v_queue_date;
  end if;

  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select task_id, sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items
  where user_id = auth.uid()
    and queue_date = v_queue_date
    and sort_order > v_order
  order by sort_order asc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_temp
  from public.task_queue_items
  where user_id = auth.uid()
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_temp
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_order
  where user_id = auth.uid()
    and task_id = v_neighbor_task
    and queue_date = v_queue_date;

  update public.task_queue_items
  set sort_order = v_neighbor_order
  where user_id = auth.uid()
    and task_id = p_task_id
    and queue_date = v_queue_date;

  return query select * from public.task_queue_list(v_queue_date);
end;
$$;

grant execute on function public.task_queue_list(date) to authenticated;
grant execute on function public.task_queue_add(uuid, date) to authenticated;
grant execute on function public.task_queue_remove(uuid, date) to authenticated;
grant execute on function public.task_queue_move_up(uuid, date) to authenticated;
grant execute on function public.task_queue_move_down(uuid, date) to authenticated;

create or replace function public.sessions_list_by_day(
  p_day date,
  p_tz text default null
)
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
language plpgsql
as $$
declare
  v_tz text;
  v_day date;
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  v_tz := coalesce(
    nullif(trim(p_tz), ''),
    (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
    'Africa/Casablanca'
  );
  v_day := coalesce(
    p_day,
    (now() at time zone v_tz)::date
  );
  v_start_at := (v_day::timestamp at time zone v_tz);
  v_end_at := ((v_day + 1)::timestamp at time zone v_tz);

  return query
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
  from public.sessions as s
  left join public.tasks as t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.started_at >= v_start_at
    and s.started_at < v_end_at
  order by s.started_at desc;
end;
$$;

create or replace function public.sessions_total_by_day(
  p_day date,
  p_tz text default null
)
returns table (
  total_seconds integer
)
language plpgsql
as $$
declare
  v_tz text;
  v_day date;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_now timestamptz;
begin
  v_tz := coalesce(
    nullif(trim(p_tz), ''),
    (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
    'Africa/Casablanca'
  );
  v_day := coalesce(
    p_day,
    (now() at time zone v_tz)::date
  );
  v_start_at := (v_day::timestamp at time zone v_tz);
  v_end_at := ((v_day + 1)::timestamp at time zone v_tz);
  v_now := now();

  return query
  with finished as (
    select coalesce(sum(coalesce(s.duration_seconds, 0)), 0)::bigint as seconds
    from public.sessions as s
    where s.user_id = auth.uid()
      and s.ended_at is not null
      and s.started_at >= v_start_at
      and s.started_at < v_end_at
  ),
  running as (
    select coalesce(sum(
      greatest(
        0,
        floor(extract(epoch from least(v_now, v_end_at) - greatest(s.started_at, v_start_at)))
      )
    ), 0)::bigint as seconds
    from public.sessions as s
    where s.user_id = auth.uid()
      and s.ended_at is null
      and s.started_at >= v_start_at
      and s.started_at < v_end_at
  )
  select (finished.seconds + running.seconds)::int as total_seconds
  from finished, running;
end;
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
  edited_at timestamptz,
  edit_reason text,
  task_title text
)
language sql
as $$
  select s.*
  from public.sessions_list_by_day(null::date, null::text) as s;
$$;

create or replace function public.work_totals(p_tz text default null)
returns table (
  today_seconds integer,
  week_seconds integer,
  month_seconds integer
)
language plpgsql
as $$
declare
  v_tz text;
  v_now timestamptz;
  v_today date;
  v_today_start timestamptz;
  v_week_start_date date;
  v_week_start timestamptz;
  v_month_start_date date;
  v_month_start timestamptz;
begin
  v_tz := coalesce(
    nullif(trim(p_tz), ''),
    (select us.timezone from public.user_settings as us where us.user_id = auth.uid()),
    'Africa/Casablanca'
  );
  v_now := now();
  v_today := (v_now at time zone v_tz)::date;
  v_today_start := (v_today::timestamp at time zone v_tz);
  v_week_start_date := (v_today - ((extract(isodow from v_today::timestamp))::int - 1));
  v_week_start := (v_week_start_date::timestamp at time zone v_tz);
  v_month_start_date := date_trunc('month', v_today::timestamp)::date;
  v_month_start := (v_month_start_date::timestamp at time zone v_tz);

  return query
  with base as (
    select s.started_at, s.ended_at, s.duration_seconds
    from public.sessions as s
    where s.user_id = auth.uid()
      and s.started_at < v_now
  ),
  finished as (
    select
      coalesce(sum(case
        when b.ended_at is not null and b.started_at >= v_today_start then coalesce(b.duration_seconds, 0)
        else 0
      end), 0)::bigint as today_seconds,
      coalesce(sum(case
        when b.ended_at is not null and b.started_at >= v_week_start then coalesce(b.duration_seconds, 0)
        else 0
      end), 0)::bigint as week_seconds,
      coalesce(sum(case
        when b.ended_at is not null and b.started_at >= v_month_start then coalesce(b.duration_seconds, 0)
        else 0
      end), 0)::bigint as month_seconds
    from base as b
  ),
  running as (
    select
      coalesce(sum(case
        when b.ended_at is null and b.started_at < v_now then greatest(
          0,
          floor(extract(epoch from v_now - greatest(b.started_at, v_today_start)))
        )
        else 0
      end), 0)::bigint as today_seconds,
      coalesce(sum(case
        when b.ended_at is null and b.started_at < v_now then greatest(
          0,
          floor(extract(epoch from v_now - greatest(b.started_at, v_week_start)))
        )
        else 0
      end), 0)::bigint as week_seconds,
      coalesce(sum(case
        when b.ended_at is null and b.started_at < v_now then greatest(
          0,
          floor(extract(epoch from v_now - greatest(b.started_at, v_month_start)))
        )
        else 0
      end), 0)::bigint as month_seconds
    from base as b
    where b.ended_at is null
  )
  select
    (finished.today_seconds + running.today_seconds)::int as today_seconds,
    (finished.week_seconds + running.week_seconds)::int as week_seconds,
    (finished.month_seconds + running.month_seconds)::int as month_seconds
  from finished, running;
end;
$$;

grant execute on function public.sessions_list_by_day(date, text) to authenticated;
grant execute on function public.sessions_total_by_day(date, text) to authenticated;
grant execute on function public.work_totals(text) to authenticated;
grant execute on function public.get_today_sessions() to authenticated;
