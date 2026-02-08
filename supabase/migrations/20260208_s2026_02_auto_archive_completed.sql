-- S2026-02: auto-archive completed tasks setting.

alter table if exists public.user_settings
  add column if not exists auto_archive_completed boolean not null default false;
