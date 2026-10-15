-- Each project has its own GitHub repository. Tasks link PRs only from the
-- repository of their project; links created before this rule are kept.
comment on table public.project_github_repositories is
  'Repository of each project. New task links must use the repository of the task''s project.';

create function public.clear_project_github_repository(target_workspace uuid, target_project uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  perform 1 from public.projects where id = target_project and workspace_id = target_workspace for update;
  if not found then raise insufficient_privilege; end if;
  delete from public.project_github_repositories where project_id = target_project and workspace_id = target_workspace;
  return target_project;
end;
$$;
revoke all on function public.clear_project_github_repository(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clear_project_github_repository(uuid,uuid) to authenticated;

create or replace function public.link_task_github(requester uuid, target_workspace uuid,
  target_task uuid, target_repository uuid, development jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare task public.tasks; result uuid; repo public.github_repositories;
begin
  perform private.require_active_member(target_workspace,requester);
  select * into task from public.tasks where id=target_task and workspace_id=target_workspace for update;
  if not found then raise insufficient_privilege; end if;
  if not exists(select 1 from public.project_github_repositories p where p.workspace_id=target_workspace
    and p.project_id=task.project_id and p.repository_id=target_repository) then
    raise exception 'Repository is not the project repository' using errcode='22023';
  end if;
  -- The row lock serializes linking with repository disconnect/selection updates.
  select * into repo from public.github_repositories
    where id=target_repository and workspace_id=target_workspace and active for share;
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

-- Repositories used by a project or a task stay selected in the connection review.
create or replace function public.begin_github_repository_selection(requester uuid, target_workspace uuid,
  target_installation bigint, state_hash text, available_repositories bigint[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare connected bigint[]; used bigint[];
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  if available_repositories is null or cardinality(available_repositories) not between 1 and 1000
    or array_position(available_repositories,null) is not null or not (0 < all(available_repositories)) then
    raise exception 'Invalid repositories' using errcode='22023';
  end if;
  select coalesce(array_agg(r.github_id),'{}'::bigint[]) into connected from public.github_repositories r
    where r.workspace_id=target_workspace and r.active and r.github_id=any(available_repositories);
  select coalesce(array_agg(distinct r.github_id),'{}'::bigint[]) into used from public.github_repositories r
    where r.workspace_id=target_workspace and r.github_id=any(available_repositories)
      and (exists(select 1 from public.task_github_links l where l.repository_id=r.id)
        or exists(select 1 from public.project_github_repositories p where p.repository_id=r.id));
  delete from private.github_repository_states where expires_at<now()
    or (user_id=requester and workspace_id=target_workspace);
  insert into private.github_repository_states(state_hash,user_id,workspace_id,installation_id,offered_ids,previous_ids)
    values(state_hash,requester,target_workspace,target_installation,available_repositories,connected);
  return jsonb_build_object('connected_ids',connected,'in_use_ids',used);
end;
$$;

create or replace function public.save_github_repository_selection(requester uuid, target_workspace uuid,
  target_installation bigint, repositories jsonb, previous_ids bigint[])
returns integer language plpgsql security definer set search_path = '' as $$
declare selected bigint[]; connected integer;
begin
  perform 1 from public.workspaces where id=target_workspace for update;
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  if jsonb_typeof(repositories) is distinct from 'array' or jsonb_array_length(repositories) not between 1 and 1000 then
    raise exception 'Invalid repositories' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(repositories) r
    where coalesce((r->>'installation_id')::bigint,0) <= 0) then
    raise exception 'Wrong installation' using errcode='22023';
  end if;
  select array_agg((r->>'id')::bigint) into selected from jsonb_array_elements(repositories) r;
  perform 1 from public.github_repositories r where r.workspace_id=target_workspace
    and (r.github_id=any(previous_ids) or r.github_id=any(selected)) for update;
  if exists(select 1 from public.github_repositories r
    where r.workspace_id=target_workspace and r.github_id=any(previous_ids) and not(r.github_id=any(selected))
      and (exists(select 1 from public.task_github_links l where l.repository_id=r.id)
        or exists(select 1 from public.project_github_repositories p where p.repository_id=r.id))) then
    raise exception 'Repository in use' using errcode='55000';
  end if;
  connected := public.finish_github_account_connection(requester,target_workspace,repositories);
  -- Only remove previously connected repositories reviewed in this selection.
  -- Connections created in another tab after discovery are left untouched.
  update public.github_repositories r set active=false where r.workspace_id=target_workspace
    and r.github_id=any(previous_ids) and not(r.github_id=any(selected));
  return connected;
end;
$$;
