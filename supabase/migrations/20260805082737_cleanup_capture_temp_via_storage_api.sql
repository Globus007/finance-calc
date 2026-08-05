-- ADR-0005 orphan TTL must delete Storage *bytes*, not only storage.objects rows.
-- Direct SQL DELETE leaves orphans in the object backend (S3 / file store).
-- Cleanup now calls the Storage HTTP API via pg_net (same path as client remove()).

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- One-time / rotate credentials for the cleanup job (Vault)
-- ---------------------------------------------------------------------------
-- Local (from inside Postgres):  p_supabase_url = 'http://kong:8000'
-- Hosted:                        p_supabase_url = 'https://<project-ref>.supabase.co'
create or replace function public.configure_capture_temp_cleanup(
  p_supabase_url text,
  p_service_role_key text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_url text := rtrim(trim(p_supabase_url), '/');
  v_key text := trim(p_service_role_key);
  v_id uuid;
begin
  if v_url is null or v_url = '' then
    raise exception 'configure_capture_temp_cleanup: supabase url is required';
  end if;
  if v_key is null or v_key = '' then
    raise exception 'configure_capture_temp_cleanup: service role key is required';
  end if;

  select s.id into v_id
  from vault.secrets s
  where s.name = 'capture_temp_supabase_url'
  limit 1;

  if v_id is null then
    perform vault.create_secret(
      v_url,
      'capture_temp_supabase_url',
      'Base URL for capture-temp Storage API orphan cleanup'
    );
  else
    perform vault.update_secret(v_id, v_url);
  end if;

  select s.id into v_id
  from vault.secrets s
  where s.name = 'capture_temp_service_role_key'
  limit 1;

  if v_id is null then
    perform vault.create_secret(
      v_key,
      'capture_temp_service_role_key',
      'Service role key for capture-temp Storage API orphan cleanup'
    );
  else
    perform vault.update_secret(v_id, v_key);
  end if;
end;
$$;

comment on function public.configure_capture_temp_cleanup(text, text) is
  'Stores Supabase URL + service_role key in Vault for capture-temp Storage API cleanup.';

revoke all on function public.configure_capture_temp_cleanup(text, text) from public;
grant execute on function public.configure_capture_temp_cleanup(text, text) to service_role;
grant execute on function public.configure_capture_temp_cleanup(text, text) to postgres;

-- ---------------------------------------------------------------------------
-- Orphan cleanup via Storage API (bytes + metadata)
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_capture_temp_orphans(
  p_max_age interval default interval '1 hour',
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public, storage, vault, net, extensions
as $$
declare
  v_base_url text;
  v_service_key text;
  v_paths text[];
  v_request_id bigint;
  v_count integer := 0;
begin
  select ds.decrypted_secret into v_base_url
  from vault.decrypted_secrets ds
  where ds.name = 'capture_temp_supabase_url'
  limit 1;

  select ds.decrypted_secret into v_service_key
  from vault.decrypted_secrets ds
  where ds.name = 'capture_temp_service_role_key'
  limit 1;

  if v_base_url is null or v_base_url = '' or v_service_key is null or v_service_key = '' then
    raise exception
      'capture-temp cleanup is not configured: call public.configure_capture_temp_cleanup(url, service_role_key) first';
  end if;

  select coalesce(array_agg(q.name order by q.created_at), array[]::text[])
  into v_paths
  from (
    select o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'capture-temp'
      and o.created_at < now() - p_max_age
    order by o.created_at asc
    limit greatest(p_limit, 1)
  ) q;

  v_count := coalesce(cardinality(v_paths), 0);
  if v_count = 0 then
    return 0;
  end if;

  -- Storage multi-delete: DELETE /storage/v1/object/{bucket} body {"prefixes":[...]}
  -- Removes object backend bytes and the storage.objects row (not SQL-only metadata).
  select net.http_delete(
    url := v_base_url || '/storage/v1/object/capture-temp',
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'apikey', v_service_key,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 15000,
    body := jsonb_build_object('prefixes', to_jsonb(v_paths))
  ) into v_request_id;

  if v_request_id is null then
    raise exception 'capture-temp cleanup: net.http_delete did not enqueue a request';
  end if;

  return v_count;
end;
$$;

comment on function public.cleanup_capture_temp_orphans(interval, integer) is
  'Enqueues Storage API delete for capture-temp objects older than p_max_age (default 1h). Deletes backend bytes, not only DB rows.';

revoke all on function public.cleanup_capture_temp_orphans(interval, integer) from public;
grant execute on function public.cleanup_capture_temp_orphans(interval, integer) to service_role;
