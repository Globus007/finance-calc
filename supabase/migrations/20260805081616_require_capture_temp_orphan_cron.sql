-- Ensure capture-temp orphan TTL job is registered (ADR-0005).
-- Hard-fails if pg_cron cannot schedule — no silent skip that leaves orphans forever.
-- Safe to re-run: replaces any prior job of the same name.

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job_id bigint;
begin
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
