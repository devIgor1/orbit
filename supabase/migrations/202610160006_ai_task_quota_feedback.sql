-- The private helper is callable only by the owner of the reservation function.
-- It returns aggregates, never identities, requests or prompts.
create function private.ai_task_quota_status(requester uuid, target_workspace uuid, checked_at timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with policies(scope, window_seconds, max_attempts) as (
    values ('user',600,15), ('user',86400,150), ('workspace',600,75), ('workspace',86400,750)
  ), attempts as (
    select 'user' as scope, created_at from private.ai_task_attempts
      where user_id = requester and created_at > checked_at - interval '24 hours'
    union all
    select 'workspace', created_at from private.ai_task_attempts
      where workspace_id = target_workspace and created_at > checked_at - interval '24 hours'
  ), usage as (
    select p.scope, p.window_seconds, p.max_attempts, count(*) as used,
      array_agg(a.created_at order by a.created_at desc) as timestamps
    from policies p join attempts a on a.scope = p.scope
      and a.created_at > checked_at - make_interval(secs => p.window_seconds)
    group by p.scope, p.window_seconds, p.max_attempts
    having count(*) >= p.max_attempts
  ), blocked as (
    -- The Nth newest attempt must expire before there is room for one more.
    -- This also handles historical usage above a cap, not just equality.
    select scope, window_seconds, max_attempts, used,
      greatest(1, ceil(extract(epoch from (
        timestamps[max_attempts] + make_interval(secs => window_seconds) - checked_at))))::integer as retry_seconds
    from usage
  )
  select case when count(*) > 0 then jsonb_build_object(
    'blocked', jsonb_agg(jsonb_build_object('scope',scope,'windowSeconds',window_seconds,
      'used',used,'limit',max_attempts,'retryAfterSeconds',retry_seconds) order by scope,window_seconds),
    'retryAfterSeconds', max(retry_seconds)) end from blocked;
$$;
revoke all on function private.ai_task_quota_status(uuid,uuid,timestamptz) from public, anon, authenticated;

create or replace function public.prepare_ai_task_request(request_id uuid, target_workspace uuid, target_project uuid, prompt_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requester uuid := auth.uid();
  job private.ai_task_requests;
  checked_at timestamptz;
  quota jsonb;
begin
  if requester is null or not private.is_member(target_workspace) or not exists (
    select 1 from public.projects where id = target_project and workspace_id = target_workspace and deleted_at is null
  ) then raise exception 'AI_FORBIDDEN' using errcode = '42501'; end if;
  if request_id is null or prompt_hash is null or prompt_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'AI_INVALID_REQUEST' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ai-task:' || requester::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-task-workspace:' || target_workspace::text, 0));
  checked_at := clock_timestamp();
  select * into job from private.ai_task_requests where id = request_id for update;
  if found then
    if job.user_id <> requester or job.workspace_id <> target_workspace or job.project_id <> target_project then
      raise exception 'AI_FORBIDDEN' using errcode = '42501';
    end if;
    if job.prompt_hash <> prompt_hash then raise exception 'AI_REQUEST_CHANGED' using errcode = '22023'; end if;
    if job.result is not null then
      if job.task_id is not null and not private.task_active(job.task_id) then
        raise exception 'AI_FORBIDDEN' using errcode = '42501';
      end if;
      return jsonb_build_object('result', job.result);
    end if;
    if job.lease_until > checked_at then raise exception 'AI_IN_PROGRESS' using errcode = 'PT409'; end if;
  end if;
  delete from private.ai_task_attempts where user_id = requester and created_at < checked_at - interval '24 hours';
  quota := private.ai_task_quota_status(requester, target_workspace, checked_at);
  if quota is not null then
    raise exception using errcode = 'PT429', detail = quota::text,
      message = case when quota->'blocked' @> '[{"scope":"user"}]'::jsonb
        then 'AI_RATE_LIMITED' else 'AI_WORKSPACE_RATE_LIMITED' end;
  end if;
  insert into private.ai_task_attempts(user_id, workspace_id, created_at) values (requester, target_workspace, checked_at);
  insert into private.ai_task_requests(id, user_id, workspace_id, project_id, prompt_hash, lease_until)
    values (request_id, requester, target_workspace, target_project, prompt_hash, checked_at + interval '90 seconds')
    on conflict (id) do update set lease_token = gen_random_uuid(), lease_until = excluded.lease_until
    where ai_task_requests.user_id = requester and ai_task_requests.workspace_id = target_workspace
      and ai_task_requests.project_id = target_project and ai_task_requests.prompt_hash = excluded.prompt_hash
    returning * into job;
  if not found then raise exception 'AI_FORBIDDEN' using errcode = '42501'; end if;
  return jsonb_build_object('leaseToken', job.lease_token);
end;
$$;
revoke all on function public.prepare_ai_task_request(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.prepare_ai_task_request(uuid,uuid,uuid,text) to authenticated;
