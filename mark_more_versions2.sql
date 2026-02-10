insert into supabase_migrations.schema_migrations(version) values
  ('202601052'),
  ('202601063')
on conflict (version) do nothing;
