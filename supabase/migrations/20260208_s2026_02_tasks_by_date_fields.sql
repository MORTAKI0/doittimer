-- S2026-02: add task date fields for calendar/day filtering.
-- Safe and backward-compatible: additive nullable columns + additive indexes.

alter table public.tasks
  add column if not exists scheduled_for date null;

alter table public.tasks
  add column if not exists completed_at timestamptz null;

create index if not exists idx_tasks_user_scheduled_for
  on public.tasks (user_id, scheduled_for);

create index if not exists idx_tasks_user_completed_at
  on public.tasks (user_id, completed_at);
