-- S2026-02 Story 2: pomodoro completion events + stats RPCs.

create table if not exists public.session_pomodoro_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  task_id uuid null,
  event_type text not null,
  pomodoro_cycle_count integer not null default 0,
  occurred_at timestamptz not null default now(),
  constraint session_pomodoro_events_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint session_pomodoro_events_session_fk
    foreign key (session_id) references public.sessions(id) on delete cascade,
  constraint session_pomodoro_events_task_fk
    foreign key (task_id) references public.tasks(id) on delete set null,
  constraint session_pomodoro_events_cycle_chk check (pomodoro_cycle_count >= 0)
);

create index if not exists idx_session_pomodoro_events_user_occurred_at
  on public.session_pomodoro_events (user_id, occurred_at desc);

create index if not exists idx_session_pomodoro_events_user_task_occurred_at
  on public.session_pomodoro_events (user_id, task_id, occurred_at desc);

create index if not exists idx_session_pomodoro_events_session_id
  on public.session_pomodoro_events (session_id);

create unique index if not exists session_pomodoro_events_unique_cycle
  on public.session_pomodoro_events (user_id, session_id, pomodoro_cycle_count, event_type);

alter table public.session_pomodoro_events enable row level security;

drop policy if exists "session_pomodoro_events_select_own" on public.session_pomodoro_events;
create policy "session_pomodoro_events_select_own"
  on public.session_pomodoro_events
  for select
  using (user_id = auth.uid());

drop policy if exists "session_pomodoro_events_insert_own" on public.session_pomodoro_events;
create policy "session_pomodoro_events_insert_own"
  on public.session_pomodoro_events
  for insert
  with check (user_id = auth.uid());

create or replace function public.get_dashboard_pomodoro_stats()
returns table (
  total_work_completed_today integer,
  top_tasks_today json
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
  ),
  events_today as (
    select e.*
    from public.session_pomodoro_events e
    where e.user_id = auth.uid()
      and e.event_type = 'work_completed'
      and e.occurred_at >= (select start_at from bounds)
      and e.occurred_at < (select end_at from bounds)
  ),
  top_tasks as (
    select
      e.task_id,
      t.title as task_title,
      count(*)::int as pomodoros
    from events_today e
    join public.tasks t on t.id = e.task_id
    where e.task_id is not null
      and t.user_id = auth.uid()
    group by e.task_id, t.title
    order by pomodoros desc, t.title
    limit 5
  )
  select
    (select count(*) from events_today)::int as total_work_completed_today,
    coalesce(
      (select json_agg(json_build_object(
        'task_id', task_id,
        'task_title', task_title,
        'pomodoros', pomodoros
      )) from top_tasks),
      '[]'::json
    ) as top_tasks_today;
$$;

create or replace function public.get_task_pomodoro_stats(p_task_id uuid)
returns table (
  pomodoros_today integer,
  pomodoros_total integer
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
    coalesce(sum(
      case
        when e.occurred_at >= (select start_at from bounds)
          and e.occurred_at < (select end_at from bounds)
          then 1
        else 0
      end
    ), 0)::int as pomodoros_today,
    coalesce(count(e.id), 0)::int as pomodoros_total
  from public.tasks t
  left join public.session_pomodoro_events e
    on e.task_id = t.id
    and e.user_id = auth.uid()
    and e.event_type = 'work_completed'
  where t.id = p_task_id
    and t.user_id = auth.uid();
$$;

grant execute on function public.get_dashboard_pomodoro_stats() to authenticated;
grant execute on function public.get_task_pomodoro_stats(uuid) to authenticated;

create or replace function public.pomodoro_skip_phase(p_session_id uuid)
returns public.sessions
language plpgsql
as $$
declare
  v_phase text;
  v_cycle_count integer;
  v_long_every integer;
  v_next_cycle_count integer;
  v_next_phase text;
  v_task_id uuid;
  v_row public.sessions%rowtype;
begin
  select s.pomodoro_phase, s.pomodoro_cycle_count, s.task_id
    into v_phase, v_cycle_count, v_task_id
  from public.sessions as s
  where s.id = p_session_id
    and s.user_id = auth.uid()
    and s.ended_at is null
  for update;

  if not found then
    return null;
  end if;

  if v_phase is null then
    v_next_phase := 'work';
    v_next_cycle_count := coalesce(v_cycle_count, 0);
  elsif v_phase = 'work' then
    v_next_cycle_count := coalesce(v_cycle_count, 0) + 1;

    select us.pomodoro_long_break_every
      into v_long_every
    from public.user_settings us
    where us.user_id = auth.uid();

    if v_long_every is null or v_long_every <= 0 then
      v_long_every := 4;
    end if;

    if (v_next_cycle_count % v_long_every) = 0 then
      v_next_phase := 'long_break';
    else
      v_next_phase := 'short_break';
    end if;

    insert into public.session_pomodoro_events (
      user_id,
      session_id,
      task_id,
      event_type,
      pomodoro_cycle_count,
      occurred_at
    )
    values (
      auth.uid(),
      p_session_id,
      v_task_id,
      'work_completed',
      v_next_cycle_count,
      now()
    )
    on conflict (user_id, session_id, pomodoro_cycle_count, event_type) do nothing;
  else
    v_next_phase := 'work';
    v_next_cycle_count := coalesce(v_cycle_count, 0);
  end if;

  update public.sessions as s
  set pomodoro_phase = v_next_phase,
      pomodoro_phase_started_at = now(),
      pomodoro_cycle_count = v_next_cycle_count,
      pomodoro_is_paused = false,
      pomodoro_paused_at = null
  where s.id = p_session_id
    and s.user_id = auth.uid()
    and s.ended_at is null
  returning s.* into v_row;

  return v_row;
end;
$$;

grant execute on function public.pomodoro_skip_phase(uuid) to authenticated;
