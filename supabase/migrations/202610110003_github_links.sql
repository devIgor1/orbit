create function public.link_task_github(requester uuid, target_workspace uuid, target_task uuid, target_repository uuid, development jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare task public.tasks; result uuid; repo public.github_repositories;
begin
  perform private.require_active_member(target_workspace,requester);
  select * into task from public.tasks where id = target_task and workspace_id = target_workspace for update;
  if not found then raise insufficient_privilege; end if;
  select r.* into repo from public.github_repositories r join public.project_github_repositories p on p.repository_id = r.id
    where p.project_id = task.project_id and r.id = target_repository and r.workspace_id = target_workspace and r.active for share of r,p;
  if not found then raise insufficient_privilege; end if;
  insert into public.task_github_links(workspace_id,project_id,task_id,repository_id,branch,head_repository_id,pr_number,pr_state,created_by)
    values(target_workspace,task.project_id,target_task,target_repository,development->>'branch',
      (development->>'head_repository_id')::bigint,(development->>'pr_number')::integer,
      case when development->>'pr_number' is null then 'branch' else 'open' end,requester) returning id into result;
  insert into private.github_sync_jobs(link_id) values(result);
  insert into public.activity_events(workspace_id,entity_type,entity_id,project_id,task_id,action,title,actor_id)
    values(target_workspace,'task',target_task,task.project_id,target_task,'github_linked',task.title,requester);
  return result;
end;
$$;
create function public.unlink_task_github(target_workspace uuid, target_task uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links;
begin
  perform private.require_active_member(target_workspace,auth.uid());
  -- A worker may already be sending a comment. Never unlink while its lease is live.
  select * into link from public.task_github_links where workspace_id = target_workspace and task_id = target_task for update;
  if not found then raise insufficient_privilege; end if;
  if exists(select 1 from private.github_sync_jobs where link_id = link.id and lease_until > now()) then
    raise exception 'Synchronization in progress' using errcode = '55P03';
  end if;
  delete from public.task_github_links where id = link.id;
  insert into public.activity_events(workspace_id,entity_type,entity_id,project_id,task_id,action,title,actor_id)
    select target_workspace,'task',id,project_id,id,'github_unlinked',title,auth.uid() from public.tasks where id = target_task;
  return link.id;
end;
$$;
create function public.retry_task_github(target_workspace uuid, target_task uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links;
begin
  perform private.require_active_member(target_workspace,auth.uid());
  select * into link from public.task_github_links where workspace_id = target_workspace and task_id = target_task for update;
  if not found then raise insufficient_privilege; end if;
  if not exists(select 1 from public.github_repositories where id = link.repository_id and active) then raise insufficient_privilege; end if;
  update private.github_sync_jobs set due_at = now(),generation = generation + 1 where link_id = link.id;
  update public.task_github_links set sync_status = 'pending',last_error_code = null where id = link.id;
  return link.id;
end;
$$;
revoke all on function public.link_task_github(uuid,uuid,uuid,uuid,jsonb),public.unlink_task_github(uuid,uuid),public.retry_task_github(uuid,uuid) from public,anon,authenticated;
grant execute on function public.link_task_github(uuid,uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.unlink_task_github(uuid,uuid),public.retry_task_github(uuid,uuid) to authenticated;
