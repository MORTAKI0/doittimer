insert into supabase_migrations.schema_migrations(version) values
  ('202602083')
on conflict (version) do nothing;
