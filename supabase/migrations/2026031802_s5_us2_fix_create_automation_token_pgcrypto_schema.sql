--/s5/us2/fix_create_automation_token_pgcrypto_schema.sql
create extension if not exists pgcrypto;

create or replace function public.create_automation_token(
  p_name text,
  p_scopes text[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_token text;
  v_hash text;
  v_prefix text;
  v_id uuid;
  v_name text;
  v_scopes text[];
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_name := nullif(trim(p_name), '');
  if v_name is null then
    raise exception 'token_name_required';
  end if;

  v_scopes := coalesce(p_scopes, array['*']::text[]);
  if array_length(v_scopes, 1) is null then
    v_scopes := array['*']::text[];
  end if;

  v_raw_token := 'ditm_' || replace(
    replace(encode(extensions.gen_random_bytes(24), 'base64'), '/', '_'),
    '+',
    '-'
  );
  v_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
  v_prefix := left(v_raw_token, 12);

  insert into public.automation_tokens (user_id, name, token_hash, token_prefix, scopes)
  values (auth.uid(), v_name, v_hash, v_prefix, v_scopes)
  returning id into v_id;

  return json_build_object(
    'id', v_id,
    'raw_token', v_raw_token,
    'prefix', v_prefix
  );
end;
$$;

grant execute on function public.create_automation_token(text, text[]) to authenticated;
