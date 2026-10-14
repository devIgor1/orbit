-- A selection may now combine the user's own installation with repositories they
-- collaborate on in other owners' installations. Repositories are scoped by their
-- GitHub ID (unique per workspace), and each one keeps its own installation_id.
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
    join public.task_github_links p on p.repository_id=r.id
    where r.workspace_id=target_workspace and r.github_id=any(available_repositories);
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
  if exists(select 1 from public.github_repositories r join public.task_github_links p on p.repository_id=r.id
    where r.workspace_id=target_workspace and r.github_id=any(previous_ids) and not(r.github_id=any(selected))) then
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
