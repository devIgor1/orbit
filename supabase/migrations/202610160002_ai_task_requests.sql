-- No prompt, credential or provider response is persisted in this ledger.
create table private.ai_task_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null,
  project_id uuid not null,
  prompt_hash text not null check (prompt_hash ~ '^[a-f0-9]{64}$'),
  task_id uuid unique,
  lease_token uuid not null default gen_random_uuid(),
  lease_until timestamptz not null default now(),
  result jsonb,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);
create table private.ai_task_attempts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_task_attempts_user_time on private.ai_task_attempts(user_id, created_at);
revoke all on private.ai_task_requests, private.ai_task_attempts from public, anon, authenticated;

create function public.prepare_ai_task_request(request_id uuid, target_workspace uuid, target_project uuid, prompt_hash text)
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
  -- Serializes the quota across projects/workspaces for this identity.
  perform pg_advisory_xact_lock(hashtextextended('ai-task:' || requester::text, 0));
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
    or (select count(*) from private.ai_task_attempts where user_id = requester) >= 100 then
    raise exception 'AI_RATE_LIMITED' using errcode = 'PT429';
  end if;
  insert into private.ai_task_attempts(user_id) values (requester);
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

create function private.lock_ai_task_request(request_id uuid, lease uuid)
returns private.ai_task_requests language plpgsql security definer set search_path = '' as $$
declare job private.ai_task_requests;
begin
  select * into job from private.ai_task_requests where id = request_id for update;
  if not found or auth.uid() is null or job.user_id <> auth.uid() or not private.is_member(job.workspace_id)
    or not private.project_active(job.project_id)
    or (job.task_id is not null and not private.task_active(job.task_id)) then
    raise exception 'AI_FORBIDDEN' using errcode = '42501';
  end if;
  if lease is null or job.lease_token <> lease or (job.result is null and job.lease_until <= now()) then
    raise exception 'AI_LEASE_EXPIRED' using errcode = 'PT409';
  end if;
  return job;
end;
$$;
revoke all on function private.lock_ai_task_request(uuid,uuid) from public, anon;
grant execute on function private.lock_ai_task_request(uuid,uuid) to authenticated;

create function private.finish_ai_task_request(request_id uuid, lease uuid, created_task uuid, clarification text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare job private.ai_task_requests; task public.tasks; outcome jsonb;
begin
  job := private.lock_ai_task_request(request_id, lease);
  if job.result is not null then return job.result; end if;
  select * into task from public.tasks where id = created_task and created_by = job.user_id
    and workspace_id = job.workspace_id and project_id = job.project_id;
  if found then
    outcome := jsonb_build_object('kind', 'created', 'task', jsonb_build_object(
      'id', task.id, 'title', task.title, 'workspace_id', task.workspace_id,
      'project_id', task.project_id, 'created_by', task.created_by));
  elsif clarification is not null and char_length(trim(clarification)) between 1 and 600 then
    outcome := jsonb_build_object('kind', 'clarification', 'message', clarification);
  else raise exception 'AI_NOT_CONFIRMED' using errcode = '22023'; end if;
  update private.ai_task_requests set result = outcome, task_id = task.id where id = job.id;
  return outcome;
end;
$$;
revoke all on function private.finish_ai_task_request(uuid,uuid,uuid,text) from public, anon;
grant execute on function private.finish_ai_task_request(uuid,uuid,uuid,text) to authenticated;

create function public.fail_ai_task_request(request_id uuid, lease uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update private.ai_task_requests set lease_until = now()
    where id = request_id and user_id = auth.uid() and lease_token = lease and result is null;
  return found;
end;
$$;
revoke all on function public.fail_ai_task_request(uuid,uuid) from public, anon;
grant execute on function public.fail_ai_task_request(uuid,uuid) to authenticated;
