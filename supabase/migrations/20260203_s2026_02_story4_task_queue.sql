-- S2026-02 Story 4: Focus Queue (Today queue)

create table if not exists public.task_queue_items (
  user_id uuid not null,
  task_id uuid not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint task_queue_items_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint task_queue_items_task_fk
    foreign key (task_id) references public.tasks(id) on delete cascade,
  constraint task_queue_items_sort_order_chk check (sort_order >= 0),
  primary key (user_id, task_id)
);

create index if not exists idx_task_queue_items_user_sort
  on public.task_queue_items (user_id, sort_order);

create unique index if not exists idx_task_queue_items_user_sort_unique
  on public.task_queue_items (user_id, sort_order);

alter table public.task_queue_items enable row level security;

drop policy if exists "task_queue_items_select_own" on public.task_queue_items;
create policy "task_queue_items_select_own"
  on public.task_queue_items
  for select
  using (user_id = auth.uid());

drop policy if exists "task_queue_items_insert_own" on public.task_queue_items;
create policy "task_queue_items_insert_own"
  on public.task_queue_items
  for insert
  with check (user_id = auth.uid());

drop policy if exists "task_queue_items_update_own" on public.task_queue_items;
create policy "task_queue_items_update_own"
  on public.task_queue_items
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "task_queue_items_delete_own" on public.task_queue_items;
create policy "task_queue_items_delete_own"
  on public.task_queue_items
  for delete
  using (user_id = auth.uid());

create or replace function public.task_queue_list()
returns table (
  task_id uuid,
  sort_order integer,
  created_at timestamptz,
  title text,
  completed boolean,
  project_id uuid,
  archived_at timestamptz
)
language sql
as $$
  select q.task_id, q.sort_order, q.created_at,
         t.title, t.completed, t.project_id, t.archived_at
  from public.task_queue_items q
  join public.tasks t on t.id = q.task_id
  where q.user_id = auth.uid()
    and t.user_id = auth.uid()
  order by q.sort_order asc, q.created_at asc;
$$;

create or replace function public.task_queue_add(p_task_id uuid)
returns table (
  task_id uuid,
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
begin
  if not exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and t.user_id = auth.uid()
      and t.archived_at is null
  ) then
    raise exception 'task_not_found';
  end if;

  select count(*) into v_count
  from public.task_queue_items q
  where q.user_id = auth.uid();

  if v_count >= 7 then
    raise exception 'queue_full';
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_next
  from public.task_queue_items q
  where q.user_id = auth.uid();

  insert into public.task_queue_items(user_id, task_id, sort_order)
  values (auth.uid(), p_task_id, v_next)
  on conflict (user_id, task_id) do nothing;

  return query select * from public.task_queue_list();
end;
$$;

create or replace function public.task_queue_remove(p_task_id uuid)
returns table (
  task_id uuid,
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
begin
  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid() and task_id = p_task_id
  for update;

  if not found then
    return query select * from public.task_queue_list();
  end if;

  delete from public.task_queue_items
  where user_id = auth.uid() and task_id = p_task_id;

  update public.task_queue_items
  set sort_order = sort_order - 1
  where user_id = auth.uid() and sort_order > v_order;

  return query select * from public.task_queue_list();
end;
$$;

create or replace function public.task_queue_move_up(p_task_id uuid)
returns table (
  task_id uuid,
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
begin
  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid() and task_id = p_task_id
  for update;

  if not found then
    return query select * from public.task_queue_list();
  end if;

  select task_id, sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items
  where user_id = auth.uid() and sort_order < v_order
  order by sort_order desc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list();
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_temp
  from public.task_queue_items
  where user_id = auth.uid();

  update public.task_queue_items
  set sort_order = v_temp
  where user_id = auth.uid() and task_id = p_task_id;

  update public.task_queue_items
  set sort_order = v_order
  where user_id = auth.uid() and task_id = v_neighbor_task;

  update public.task_queue_items
  set sort_order = v_neighbor_order
  where user_id = auth.uid() and task_id = p_task_id;

  return query select * from public.task_queue_list();
end;
$$;

create or replace function public.task_queue_move_down(p_task_id uuid)
returns table (
  task_id uuid,
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
begin
  select sort_order into v_order
  from public.task_queue_items
  where user_id = auth.uid() and task_id = p_task_id
  for update;

  if not found then
    return query select * from public.task_queue_list();
  end if;

  select task_id, sort_order into v_neighbor_task, v_neighbor_order
  from public.task_queue_items
  where user_id = auth.uid() and sort_order > v_order
  order by sort_order asc
  limit 1;

  if v_neighbor_task is null then
    return query select * from public.task_queue_list();
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_temp
  from public.task_queue_items
  where user_id = auth.uid();

  update public.task_queue_items
  set sort_order = v_temp
  where user_id = auth.uid() and task_id = p_task_id;

  update public.task_queue_items
  set sort_order = v_order
  where user_id = auth.uid() and task_id = v_neighbor_task;

  update public.task_queue_items
  set sort_order = v_neighbor_order
  where user_id = auth.uid() and task_id = p_task_id;

  return query select * from public.task_queue_list();
end;
$$;

grant execute on function public.task_queue_list() to authenticated;
grant execute on function public.task_queue_add(uuid) to authenticated;
grant execute on function public.task_queue_remove(uuid) to authenticated;
grant execute on function public.task_queue_move_up(uuid) to authenticated;
grant execute on function public.task_queue_move_down(uuid) to authenticated;
