-- Run after creating both secrets in Supabase Vault (see docs/GITHUB_APP.md).
-- This script contains no credentials and may be rerun to update the schedule.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare existing bigint;
begin
  if not exists(select 1 from vault.decrypted_secrets where name = 'orbit_github_worker_url')
    or not exists(select 1 from vault.decrypted_secrets where name = 'orbit_github_worker_secret') then
    raise exception 'Configure orbit_github_worker_url and orbit_github_worker_secret in Vault first';
  end if;
  select jobid into existing from cron.job where jobname = 'orbit-github-worker';
  if existing is not null then perform cron.unschedule(existing); end if;
  perform cron.schedule('orbit-github-worker','* * * * *',$cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'orbit_github_worker_url'),
      headers := jsonb_build_object('Content-Type','application/json','x-orbit-worker-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'orbit_github_worker_secret')),
      body := '{}'::jsonb,timeout_milliseconds := 120000
    );
  $cron$);
end;
$$;
