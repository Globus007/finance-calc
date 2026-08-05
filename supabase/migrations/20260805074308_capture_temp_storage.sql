-- Ephemeral capture media (Receipt / Recording) temp bucket.
-- Spec: ADR-0005, issue #22.
--
-- Lifecycle:
--   1. Client uploads under {auth.uid()}/{uuid} (signed URL or JWT + INSERT policy).
--   2. Extract path reads/deletes via service_role (no client SELECT/DELETE).
--   3. Orphan safety: objects older than 1 hour are removed by scheduled cleanup.

-- ---------------------------------------------------------------------------
-- Bucket: private, capture-only, size/MIME limits (photo ≤5MB; voice ≤2MB)
-- ---------------------------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'capture-temp',
  'capture-temp',
  false,
  5242880, -- 5 MiB hard ceiling (photo); voice enforced ≤2 MiB in app/server
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-m4a',
    'audio/m4a'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage RLS: user-prefix upload only; no client list/read/delete
-- ---------------------------------------------------------------------------
-- First path segment must equal auth.uid() (foldername[1]).
create policy capture_temp_insert_own_prefix
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'capture-temp'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Intentionally no SELECT / UPDATE / DELETE policies for authenticated.
-- service_role bypasses RLS for server-side extract read + eager delete.

-- ---------------------------------------------------------------------------
-- Orphan TTL cleanup (1 hour) — safety net after eager extract delete
-- ---------------------------------------------------------------------------
-- Prefer Storage API from the app server when possible. This function is the
-- DB-side net for orphans (upload without extract / crash before delete).
-- Uses storage.allow_delete_query so the Storage SQL guard allows the delete;
-- Storage API paths remain the primary delete mechanism for the extract hop.

create or replace function public.cleanup_capture_temp_orphans(
  p_max_age interval default interval '1 hour',
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_count integer := 0;
begin
  -- Allow direct SQL delete on storage.objects for this session (Storage guard).
  perform set_config('storage.allow_delete_query', 'true', true);

  with doomed as (
    select id
    from storage.objects
    where bucket_id = 'capture-temp'
      and created_at < now() - p_max_age
    order by created_at asc
    limit greatest(p_limit, 1)
    for update skip locked
  ),
  removed as (
    delete from storage.objects o
    using doomed d
    where o.id = d.id
    returning o.id
  )
  select count(*)::integer into deleted_count from removed;

  return deleted_count;
end;
$$;

comment on function public.cleanup_capture_temp_orphans(interval, integer) is
  'Deletes capture-temp Storage objects older than p_max_age (default 1h). Orphan safety net for ADR-0005.';

revoke all on function public.cleanup_capture_temp_orphans(interval, integer) from public;
grant execute on function public.cleanup_capture_temp_orphans(interval, integer) to service_role;

-- Schedule every 15 minutes. ADR-0005 requires a 1h orphan TTL safety net — migration
-- must fail if the job cannot be registered (no silent skip that leaves orphans forever).
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job_id bigint;
begin
  -- Idempotent: drop previous schedule by name if present.
  if exists (
    select 1 from cron.job where jobname = 'cleanup-capture-temp-orphans'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup-capture-temp-orphans';
  end if;

  select cron.schedule(
    'cleanup-capture-temp-orphans',
    '*/15 * * * *',
    $cron$select public.cleanup_capture_temp_orphans(interval '1 hour', 500);$cron$
  ) into v_job_id;

  if v_job_id is null then
    raise exception
      'failed to schedule cleanup-capture-temp-orphans (cron.schedule returned null)';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'cleanup-capture-temp-orphans'
      and active
  ) then
    raise exception
      'cleanup-capture-temp-orphans cron job missing or inactive after schedule';
  end if;
end;
$$;
