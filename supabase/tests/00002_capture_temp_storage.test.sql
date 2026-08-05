-- Acceptance checks for capture-temp Storage (ADR-0005 / issue #22).
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- ---------------------------------------------------------------------------
-- Bucket configuration
-- ---------------------------------------------------------------------------
select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'capture-temp'
      and name = 'capture-temp'
      and public is false
  ),
  'capture-temp bucket exists and is private'
);

select is(
  (
    select file_size_limit
    from storage.buckets
    where id = 'capture-temp'
  ),
  5242880::bigint,
  'capture-temp file_size_limit is 5 MiB'
);

select ok(
  (
    select allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
    from storage.buckets
    where id = 'capture-temp'
  ),
  'capture-temp allows receipt image MIME types'
);

select ok(
  (
    select allowed_mime_types && array['audio/webm', 'audio/mp4', 'audio/mpeg']::text[]
    from storage.buckets
    where id = 'capture-temp'
  ),
  'capture-temp allows recording audio MIME types'
);

-- ---------------------------------------------------------------------------
-- Policies: insert own prefix only; no client select/delete
-- ---------------------------------------------------------------------------
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'capture_temp_insert_own_prefix'
      and cmd = 'INSERT'
  ),
  'INSERT policy scopes uploads to user prefix'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'capture_temp%'
      and cmd in ('SELECT', 'UPDATE', 'DELETE')
  ),
  'no authenticated SELECT/UPDATE/DELETE policies on capture-temp'
);

-- ---------------------------------------------------------------------------
-- TTL cleanup function present (1h orphan safety)
-- ---------------------------------------------------------------------------
select has_function(
  'public',
  'cleanup_capture_temp_orphans',
  array['interval', 'integer'],
  'cleanup_capture_temp_orphans(interval, integer) exists'
);

select ok(
  (
    select pg_get_functiondef(p.oid) ilike '%1 hour%'
      or pg_get_functiondef(p.oid) ilike '%p_max_age%'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'cleanup_capture_temp_orphans'
    limit 1
  ),
  'cleanup function documents TTL max-age parameter'
);

-- ---------------------------------------------------------------------------
-- Scheduled orphan cleanup (ADR-0005 1h TTL) must be registered — not optional
-- ---------------------------------------------------------------------------
select ok(
  exists (select 1 from pg_extension where extname = 'pg_cron'),
  'pg_cron extension is installed for orphan TTL'
);

select ok(
  exists (
    select 1
    from cron.job
    where jobname = 'cleanup-capture-temp-orphans'
      and active
      and command ilike '%cleanup_capture_temp_orphans%'
  ),
  'active cron job schedules cleanup_capture_temp_orphans'
);

select * from finish();

rollback;
