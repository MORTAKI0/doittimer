-- S2-US5: user settings RPCs.
-- If settings are missing, we insert defaults and return the new row.

create or replace function public.get_user_settings()
returns table (
  timezone text,
  default_task_id uuid
)
language plpgsql
as $$
declare
  settings_row record;
begin
  select us.timezone, us.default_task_id
  into settings_row
  from public.user_settings us
  where us.user_id = auth.uid();

  if not found then
    insert into public.user_settings (user_id)
    values (auth.uid())
    returning timezone, default_task_id
    into settings_row;
  end if;

  return query select settings_row.timezone, settings_row.default_task_id;
end;
$$;

create or replace function public.upsert_user_settings(
  p_timezone text,
  p_default_task_id uuid
)
returns table (
  timezone text,
  default_task_id uuid
)
language sql
as $$
  insert into public.user_settings (user_id, timezone, default_task_id)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_timezone), ''), 'Africa/Casablanca'),
    p_default_task_id
  )
  on conflict (user_id) do update
    set timezone = excluded.timezone,
        default_task_id = excluded.default_task_id,
        updated_at = now()
  returning timezone, default_task_id;
$$;

grant execute on function public.get_user_settings() to authenticated;
grant execute on function public.upsert_user_settings(text, uuid) to authenticated;
