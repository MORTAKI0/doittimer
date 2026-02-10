-- S2026-02 Dashboard V1: additive indexes for KPI and queue lookups.

create index if not exists idx_tasks_user_created_at
  on public.tasks (user_id, created_at);

create index if not exists idx_tasks_user_completed_at
  on public.tasks (user_id, completed_at);

create index if not exists idx_tasks_user_archived_at
  on public.tasks (user_id, archived_at);

create index if not exists idx_task_queue_items_user_created_at
  on public.task_queue_items (user_id, created_at);