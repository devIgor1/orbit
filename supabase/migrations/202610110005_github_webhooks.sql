-- The signature is verified by the Edge Function before calling this service-only RPC.
-- Store only delivery IDs; event bodies/code/user details are not retained.
create function public.receive_github_event(delivery uuid, event_name text, event jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare installation bigint = (event->'installation'->>'id')::bigint; repository bigint = (event->'repository'->>'id')::bigint;
begin
  insert into private.github_deliveries(id) values(delivery) on conflict do nothing;
  if not found then return false; end if;
  delete from private.github_deliveries where received_at < now() - interval '30 days';
  if event_name = 'installation' and event->>'action' in ('deleted','suspend') then
    update public.github_repositories set active = false where installation_id = installation;
  elsif event_name = 'installation_repositories' and event->>'action' = 'removed' then
    update public.github_repositories set active = false where installation_id = installation
      and github_id in (select (value->>'id')::bigint from jsonb_array_elements(event->'repositories_removed'));
  elsif event_name = 'repository' and event->>'action' = 'deleted' then
    update public.github_repositories set active = false where installation_id = installation and github_id = repository;
  end if;
  update public.task_github_links l set sync_status = 'unavailable',last_error_code = 'GITHUB_UNAVAILABLE'
    from public.github_repositories r where r.id = l.repository_id and r.installation_id = installation and not r.active;
  -- Status always comes from a fresh API read, never from an out-of-order webhook.
  update private.github_sync_jobs j set due_at = now(),generation = generation + 1
    from public.task_github_links l join public.github_repositories r on r.id = l.repository_id
    where j.link_id = l.id and r.installation_id = installation and r.github_id = repository and r.active
      and ((event_name = 'pull_request' and (l.pr_number = (event->'pull_request'->>'number')::integer
        or (l.pr_number is null and l.branch = event->'pull_request'->'head'->>'ref'
          and l.head_repository_id = (event->'pull_request'->'head'->'repo'->>'id')::bigint)))
        or (event_name = 'push' and event->>'ref' = 'refs/heads/' || l.branch));
  return true;
end;
$$;
revoke all on function public.receive_github_event(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.receive_github_event(uuid,text,jsonb) to service_role;
