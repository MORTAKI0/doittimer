insert into supabase_migrations.schema_migrations(version) values
  ('202601051'),
  ('202601061'),
  ('202601062'),
  ('202602081'),
  ('202602082')
on conflict (version) do nothing;
