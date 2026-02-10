alter table if exists public.sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sessions'
      and policyname = 'sessions_insert_own'
  ) then
    create policy "sessions_insert_own"
      on public.sessions
      for insert
      with check (user_id = auth.uid());
  end if;
end $$;

create or replace function public.session_add_manual(
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_task_id uuid default null
)
returns public.sessions
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid;
  v_task_id uuid;
  v_session public.sessions%rowtype;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  if p_ended_at < p_started_at then
    raise exception 'ended_at must be greater than or equal to started_at';
  end if;

  if (p_ended_at - p_started_at) > interval '12 hours' then
    raise exception 'duration exceeds 12 hours';
  end if;

  if p_task_id is null then
    v_task_id := null;
  else
    select t.id
      into v_task_id
    from public.tasks as t
    where t.id = p_task_id
      and t.user_id = v_uid;

    if v_task_id is null then
      raise exception 'invalid task_id';
    end if;
  end if;

  insert into public.sessions (
    user_id,
    task_id,
    started_at,
    ended_at,
    duration_seconds
  )
  values (
    v_uid,
    v_task_id,
    p_started_at,
    p_ended_at,
    extract(epoch from (p_ended_at - p_started_at))::int
  )
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.session_add_manual(timestamptz, timestamptz, uuid) from public;
revoke all on function public.session_add_manual(timestamptz, timestamptz, uuid) from anon;
grant execute on function public.session_add_manual(timestamptz, timestamptz, uuid) to authenticated;
