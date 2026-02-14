do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      execute 'alter publication supabase_realtime add table public.sessions';
    exception
      when duplicate_object then
        null;
    end;

    begin
      execute 'alter publication supabase_realtime add table public.tasks';
    exception
      when duplicate_object then
        null;
    end;

    begin
      execute 'alter publication supabase_realtime add table public.task_queue_items';
    exception
      when duplicate_object then
        null;
    end;
  end if;
end
$$;
