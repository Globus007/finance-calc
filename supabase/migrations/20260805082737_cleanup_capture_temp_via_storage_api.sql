-- ADR-0005 orphan TTL must delete Storage *bytes*, not only storage.objects rows.
-- Direct SQL DELETE leaves orphans in the object backend (S3 / file store).
-- Cleanup calls the Storage HTTP API synchronously via the http extension
-- (pg_net is async and only runs after COMMIT — await in-function would hang).

create extension if not exists http with schema extensions;

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
set search_path = public, storage, vault, extensions
as $$
declare
  v_base_url text;
  v_service_key text;
  v_paths text[];
  v_count integer := 0;
  v_remaining integer := 0;
  v_resp extensions.http_response;
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
  -- Synchronous call so we can observe HTTP status in this transaction.
  v_resp := extensions.http(
    (
      'DELETE',
      v_base_url || '/storage/v1/object/capture-temp',
      array[
        extensions.http_header('Authorization', 'Bearer ' || v_service_key),
        extensions.http_header('apikey', v_service_key)
      ]::extensions.http_header[],
      'application/json',
      jsonb_build_object('prefixes', to_jsonb(v_paths))::text
    )::extensions.http_request
  );

  if v_resp.status is null or v_resp.status < 200 or v_resp.status >= 300 then
    raise exception
      'capture-temp cleanup: Storage API returned HTTP % for % object(s): %',
      coalesce(v_resp.status, -1),
      v_count,
      left(coalesce(v_resp.content, ''), 500);
  end if;

  -- Confirm metadata rows are gone; if any remain, TTL cleanup did not succeed.
  select count(*)::integer into v_remaining
  from storage.objects o
  where o.bucket_id = 'capture-temp'
    and o.name = any (v_paths);

  if v_remaining > 0 then
    raise exception
      'capture-temp cleanup: Storage API HTTP % but % of % object row(s) still present',
      v_resp.status,
      v_remaining,
      v_count;
  end if;

  return v_count;
end;
$$;

comment on function public.cleanup_capture_temp_orphans(interval, integer) is
  'Deletes capture-temp objects older than p_max_age via Storage API; checks HTTP status and verifies rows are gone.';

revoke all on function public.cleanup_capture_temp_orphans(interval, integer) from public;
grant execute on function public.cleanup_capture_temp_orphans(interval, integer) to service_role;
