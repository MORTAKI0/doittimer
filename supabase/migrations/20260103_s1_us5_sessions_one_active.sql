-- S1-US5: prevent multiple active sessions per user.
-- Before applying, ensure no user has more than one active session:
-- select user_id, count(*) as active_count
-- from public.sessions
-- where ended_at is null
-- group by user_id
-- having count(*) > 1;

create unique index if not exists sessions_one_active_per_user
  on public.sessions (user_id)
  where ended_at is null;
