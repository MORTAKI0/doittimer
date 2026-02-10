create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key
);

insert into supabase_migrations.schema_migrations(version) values
  ('20260102'),
  ('20260103'),
  ('20260104'),
  ('20260105'),
  ('20260106'),
  ('20260107'),
  ('20260108'),
  ('20260109'),
  ('20260129'),
  ('20260130'),
  ('20260131'),
  ('20260201'),
  ('20260202'),
  ('20260203'),
  ('20260208')
on conflict (version) do nothing;
