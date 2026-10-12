create function public.begin_github_connection(requester uuid, target_workspace uuid, repository_name text, state_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.require_active_member(target_workspace, requester) <> 'admin' then raise insufficient_privilege; end if;
  delete from private.github_oauth_states where expires_at < now() or (user_id = requester and workspace_id = target_workspace);
  insert into private.github_oauth_states(state_hash,user_id,workspace_id,repository_name)
    values(state_hash,requester,target_workspace,repository_name);
end;
$$;
create function public.consume_github_connection(requester uuid, state_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pending private.github_oauth_states;
begin
  delete from private.github_oauth_states s where s.state_hash = consume_github_connection.state_hash
    and s.user_id = requester and s.expires_at > now() returning * into pending;
  if not found then raise exception 'Invalid OAuth state' using errcode = '22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  return jsonb_build_object('workspace_id',pending.workspace_id,'repository_name',pending.repository_name);
end;
$$;
create function public.finish_github_connection(requester uuid, target_workspace uuid, repository jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  insert into public.github_repositories(workspace_id,github_id,installation_id,full_name,default_branch,is_private,connected_by)
    values(target_workspace,(repository->>'id')::bigint,(repository->>'installation_id')::bigint,
      repository->>'full_name',repository->>'default_branch',(repository->>'private')::boolean,requester)
    on conflict(workspace_id,github_id) do update set installation_id = excluded.installation_id,
      full_name = excluded.full_name, default_branch = excluded.default_branch, is_private = excluded.is_private,
      connected_by = excluded.connected_by, active = true returning id into result;
  update private.github_sync_jobs set due_at = now(),generation = generation + 1
    where link_id in (select id from public.task_github_links where repository_id = result);
  return result;
end;
$$;
create function public.set_project_github_repository(target_workspace uuid, target_project uuid, target_repository uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  perform 1 from public.projects where id = target_project and workspace_id = target_workspace for update;
  if not found then raise insufficient_privilege; end if;
  if not exists(select 1 from public.github_repositories where id = target_repository and workspace_id = target_workspace and active) then
    raise exception 'Repository unavailable' using errcode = '23503';
  end if;
  insert into public.project_github_repositories(workspace_id,project_id,repository_id)
    values(target_workspace,target_project,target_repository)
    on conflict(project_id) do update set repository_id = excluded.repository_id;
  return target_repository;
end;
$$;
create function public.disconnect_github_repository(target_workspace uuid, target_repository uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  update public.github_repositories set active = false where id = target_repository and workspace_id = target_workspace;
  if not found then raise insufficient_privilege; end if;
  update public.task_github_links set sync_status = 'unavailable',last_error_code = 'GITHUB_UNAVAILABLE'
    where repository_id = target_repository;
  return target_repository;
end;
$$;
revoke all on function public.begin_github_connection(uuid,uuid,text,text),public.consume_github_connection(uuid,text),
  public.finish_github_connection(uuid,uuid,jsonb),public.set_project_github_repository(uuid,uuid,uuid),
  public.disconnect_github_repository(uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_github_connection(uuid,uuid,text,text),public.consume_github_connection(uuid,text),
  public.finish_github_connection(uuid,uuid,jsonb) to service_role;
grant execute on function public.set_project_github_repository(uuid,uuid,uuid),public.disconnect_github_repository(uuid,uuid) to authenticated;
