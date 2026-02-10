create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations_files (
  name text primary key
);

insert into supabase_migrations.schema_migrations_files(name) values
  ('20260105_s1_us4_fix_rpc_overload_v2.sql'),
  ('20260106_s2_us5_user_settings.sql'),
  ('20260106_s2_us5_user_settings_rpcs.sql')
on conflict (name) do nothing;
