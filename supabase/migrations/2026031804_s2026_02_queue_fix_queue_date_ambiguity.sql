-- Avoid queue_date ambiguity inside RETURNS TABLE scope by using the PK
-- constraint name in the conflict target instead of a column list.

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
  on conflict on constraint task_queue_items_pkey do nothing;

  return query
  select * from public.task_queue_list(v_queue_date);
end;
$$;
