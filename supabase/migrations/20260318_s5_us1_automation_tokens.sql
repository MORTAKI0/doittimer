--/s5/us1/automation_tokens.sql
create extension if not exists pgcrypto;

create table if not exists public.automation_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_hash text not null,
  token_prefix text not null,
  scopes text[] not null default '{"*"}',
  last_used_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.automation_tokens
  add column if not exists name text,
  add column if not exists token_hash text,
  add column if not exists token_prefix text,
  add column if not exists scopes text[] not null default '{"*"}',
  add column if not exists last_used_at timestamptz null,
  add column if not exists revoked_at timestamptz null,
  add column if not exists created_at timestamptz not null default now();

update public.automation_tokens
set scopes = '{"*"}'
where scopes is null;

alter table public.automation_tokens
  alter column name set not null,
  alter column token_hash set not null,
  alter column token_prefix set not null,
  alter column scopes set default '{"*"}',
  alter column scopes set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create unique index if not exists idx_automation_tokens_token_hash
  on public.automation_tokens (token_hash);

create index if not exists idx_automation_tokens_user_active_created
  on public.automation_tokens (user_id, revoked_at, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'automation_tokens_token_hash_key'
      and conrelid = 'public.automation_tokens'::regclass
  ) then
    alter table public.automation_tokens
      add constraint automation_tokens_token_hash_key unique using index idx_automation_tokens_token_hash;
  end if;
end $$;

alter table public.automation_tokens enable row level security;

drop policy if exists "automation_tokens_select_own" on public.automation_tokens;
create policy "automation_tokens_select_own"
  on public.automation_tokens
  for select
  using (user_id = auth.uid());

drop policy if exists "automation_tokens_insert_own" on public.automation_tokens;
create policy "automation_tokens_insert_own"
  on public.automation_tokens
  for insert
  with check (user_id = auth.uid());

drop policy if exists "automation_tokens_update_own" on public.automation_tokens;
create policy "automation_tokens_update_own"
  on public.automation_tokens
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
