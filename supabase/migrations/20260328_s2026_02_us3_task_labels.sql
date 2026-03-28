-- S2026-02 US-03 V2: task labels and label filtering.

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color_hex text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint labels_name_trimmed_chk check (btrim(name) <> ''),
  constraint labels_color_hex_preset_chk check (
    color_hex in (
      '#DB4035',
      '#EB8909',
      '#F9C74F',
      '#299438',
      '#6ACCBC',
      '#158FAD',
      '#14AAF5',
      '#96C3EB',
      '#4073FF',
      '#884DFF',
      '#AF38EB',
      '#E05194'
    )
  )
);

create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create index if not exists idx_labels_user_id
  on public.labels (user_id);

create unique index if not exists idx_labels_user_normalized_name
  on public.labels (user_id, lower(btrim(name)));

create index if not exists idx_task_labels_task_id
  on public.task_labels (task_id);

create index if not exists idx_task_labels_label_id
  on public.task_labels (label_id);

create index if not exists idx_task_labels_label_task
  on public.task_labels (label_id, task_id);

alter table public.labels enable row level security;
alter table public.task_labels enable row level security;

create or replace function public.set_labels_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_labels_updated_at on public.labels;
create trigger set_labels_updated_at
before update on public.labels
for each row
execute function public.set_labels_updated_at();

drop policy if exists "labels_select_own" on public.labels;
create policy "labels_select_own"
  on public.labels
  for select
  using (user_id = auth.uid());

drop policy if exists "labels_insert_own" on public.labels;
create policy "labels_insert_own"
  on public.labels
  for insert
  with check (user_id = auth.uid());

drop policy if exists "labels_update_own" on public.labels;
create policy "labels_update_own"
  on public.labels
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "labels_delete_own" on public.labels;
create policy "labels_delete_own"
  on public.labels
  for delete
  using (user_id = auth.uid());

drop policy if exists "task_labels_select_own" on public.task_labels;
create policy "task_labels_select_own"
  on public.task_labels
  for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_labels.task_id
        and t.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.labels l
      where l.id = task_labels.label_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "task_labels_insert_own" on public.task_labels;
create policy "task_labels_insert_own"
  on public.task_labels
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_labels.task_id
        and t.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.labels l
      where l.id = task_labels.label_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "task_labels_delete_own" on public.task_labels;
create policy "task_labels_delete_own"
  on public.task_labels
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_labels.task_id
        and t.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.labels l
      where l.id = task_labels.label_id
        and l.user_id = auth.uid()
    )
  );
