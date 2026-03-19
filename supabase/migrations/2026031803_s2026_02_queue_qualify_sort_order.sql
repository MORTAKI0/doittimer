-- Qualify queue column references inside date-aware queue functions to avoid
-- ambiguity with RETURNS TABLE output variables such as sort_order/task_id.

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

  select coalesce(max(q.sort_order), -1) + 1 into v_next
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

  select q.sort_order into v_order
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  delete from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = q.sort_order - 1
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date
    and q.sort_order > v_order;

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

  select q.sort_order into v_order
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select q.task_id, q.sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date
    and q.sort_order < v_order
  order by q.sort_order desc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select coalesce(max(q.sort_order), -1) + 1 into v_temp
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_temp
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_order
  where q.user_id = auth.uid()
    and q.task_id = v_neighbor_task
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_neighbor_order
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date;

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

  select q.sort_order into v_order
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date
  for update;

  if not found then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select q.task_id, q.sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date
    and q.sort_order > v_order
  order by q.sort_order asc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list(v_queue_date);
  end if;

  select coalesce(max(q.sort_order), -1) + 1 into v_temp
  from public.task_queue_items as q
  where q.user_id = auth.uid()
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_temp
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_order
  where q.user_id = auth.uid()
    and q.task_id = v_neighbor_task
    and q.queue_date = v_queue_date;

  update public.task_queue_items as q
  set sort_order = v_neighbor_order
  where q.user_id = auth.uid()
    and q.task_id = p_task_id
    and q.queue_date = v_queue_date;

  return query select * from public.task_queue_list(v_queue_date);
end;
$$;
