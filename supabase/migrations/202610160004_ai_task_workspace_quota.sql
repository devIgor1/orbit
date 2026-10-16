-- Legacy attempts retain their user quota. Their workspace cannot be inferred safely.
alter table private.ai_task_attempts add column workspace_id uuid references public.workspaces(id) on delete set null;
create index ai_task_attempts_workspace_time on private.ai_task_attempts(workspace_id, created_at);

create or replace function public.prepare_ai_task_request(request_id uuid, target_workspace uuid, target_project uuid, prompt_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requester uuid := auth.uid();
  job private.ai_task_requests;
begin
  if requester is null or not private.is_member(target_workspace) or not exists (
    select 1 from public.projects where id = target_project and workspace_id = target_workspace and deleted_at is null
  ) then raise exception 'AI_FORBIDDEN' using errcode = '42501'; end if;
  if request_id is null or prompt_hash is null or prompt_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'AI_INVALID_REQUEST' using errcode = '22023';
  end if;
  -- Always lock identity, then workspace: both quotas are atomic across concurrent callers.
  perform pg_advisory_xact_lock(hashtextextended('ai-task:' || requester::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-task-workspace:' || target_workspace::text, 0));
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
    if job.lease_until > now() then raise exception 'AI_IN_PROGRESS' using errcode = 'PT409'; end if;
  end if;
  delete from private.ai_task_attempts where user_id = requester and created_at < now() - interval '1 day';
  if (select count(*) from private.ai_task_attempts where user_id = requester and created_at > now() - interval '10 minutes') >= 10
    or (select count(*) from private.ai_task_attempts where user_id = requester and created_at > now() - interval '1 day') >= 100 then
    raise exception 'AI_RATE_LIMITED' using errcode = 'PT429';
  end if;
  if (select count(*) from private.ai_task_attempts where workspace_id = target_workspace and created_at > now() - interval '10 minutes') >= 50
    or (select count(*) from private.ai_task_attempts where workspace_id = target_workspace and created_at > now() - interval '1 day') >= 500 then
    raise exception 'AI_WORKSPACE_RATE_LIMITED' using errcode = 'PT429';
  end if;
  insert into private.ai_task_attempts(user_id, workspace_id) values (requester, target_workspace);
  insert into private.ai_task_requests(id, user_id, workspace_id, project_id, prompt_hash, lease_until)
    values (request_id, requester, target_workspace, target_project, prompt_hash, now() + interval '90 seconds')
    on conflict (id) do update set lease_token = gen_random_uuid(), lease_until = now() + interval '90 seconds'
    where ai_task_requests.user_id = requester and ai_task_requests.workspace_id = target_workspace
      and ai_task_requests.project_id = target_project and ai_task_requests.prompt_hash = excluded.prompt_hash
    returning * into job;
  if not found then raise exception 'AI_FORBIDDEN' using errcode = '42501'; end if;
  return jsonb_build_object('leaseToken', job.lease_token);
end;
$$;
revoke all on function public.prepare_ai_task_request(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.prepare_ai_task_request(uuid,uuid,uuid,text) to authenticated;
