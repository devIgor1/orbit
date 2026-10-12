-- Repository consent in Orbit is separate from the App's GitHub permissions.
create table private.github_repository_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  installation_id bigint not null check (installation_id > 0),
  offered_ids bigint[] not null,
  previous_ids bigint[] not null,
  selected_ids bigint[],
  expires_at timestamptz not null default now() + interval '10 minutes'
);
revoke all on private.github_repository_states from public, anon, authenticated;

create function public.begin_github_repository_selection(requester uuid, target_workspace uuid,
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
    where r.workspace_id=target_workspace and r.installation_id=target_installation and r.active
      and r.github_id=any(available_repositories);
  select coalesce(array_agg(distinct r.github_id),'{}'::bigint[]) into used from public.github_repositories r
    join public.project_github_repositories p on p.repository_id=r.id
    where r.workspace_id=target_workspace and r.installation_id=target_installation
      and r.github_id=any(available_repositories);
  delete from private.github_repository_states where expires_at<now()
    or (user_id=requester and workspace_id=target_workspace);
  insert into private.github_repository_states(state_hash,user_id,workspace_id,installation_id,offered_ids,previous_ids)
    values(state_hash,requester,target_workspace,target_installation,available_repositories,connected);
  return jsonb_build_object('connected_ids',connected,'in_use_ids',used);
end;
$$;

create function public.select_github_repositories(requester uuid, state_hash text, next_hash text, repository_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare pending private.github_repository_states;
begin
  delete from private.github_repository_states s where s.state_hash=select_github_repositories.state_hash
    and s.user_id=requester and s.expires_at>now() and s.selected_ids is null returning * into pending;
  if not found then raise exception 'Invalid selection state' using errcode='22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  if repository_ids is null or cardinality(repository_ids) not between 1 and 1000
    or array_position(repository_ids,null) is not null or not (repository_ids <@ pending.offered_ids)
    or cardinality(repository_ids)<>(select count(distinct id) from unnest(repository_ids) id) then
    raise exception 'Invalid selection' using errcode='22023';
  end if;
  insert into private.github_repository_states(state_hash,user_id,workspace_id,installation_id,offered_ids,previous_ids,selected_ids)
    values(next_hash,requester,pending.workspace_id,pending.installation_id,pending.offered_ids,pending.previous_ids,repository_ids);
end;
$$;

create function public.consume_github_repository_selection(requester uuid, state_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pending private.github_repository_states;
begin
  delete from private.github_repository_states s where s.state_hash=consume_github_repository_selection.state_hash
    and s.user_id=requester and s.expires_at>now() and s.selected_ids is not null returning * into pending;
  if not found then raise exception 'Invalid selection state' using errcode='22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  return jsonb_build_object('workspace_id',pending.workspace_id,'installation_id',pending.installation_id,
    'selected_ids',pending.selected_ids,'previous_ids',pending.previous_ids);
end;
$$;

create function public.save_github_repository_selection(requester uuid, target_workspace uuid,
  target_installation bigint, repositories jsonb, previous_ids bigint[])
returns integer language plpgsql security definer set search_path = '' as $$
declare selected bigint[]; connected integer;
begin
  perform 1 from public.workspaces where id=target_workspace for update;
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  if jsonb_typeof(repositories) is distinct from 'array' or jsonb_array_length(repositories) not between 1 and 1000 then
    raise exception 'Invalid repositories' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(repositories) r where (r->>'installation_id')::bigint is distinct from target_installation) then
    raise exception 'Wrong installation' using errcode='22023';
  end if;
  select array_agg((r->>'id')::bigint) into selected from jsonb_array_elements(repositories) r;
  perform 1 from public.github_repositories r where r.workspace_id=target_workspace and r.installation_id=target_installation for update;
  if exists(select 1 from public.github_repositories r join public.project_github_repositories p on p.repository_id=r.id
    where r.workspace_id=target_workspace and r.installation_id=target_installation
      and r.github_id=any(previous_ids) and not(r.github_id=any(selected))) then
    raise exception 'Repository in use' using errcode='55000';
  end if;
  connected := public.finish_github_account_connection(requester,target_workspace,repositories);
  -- Only remove previously connected repositories reviewed in this selection.
  -- Connections created in another tab after discovery are left untouched.
  update public.github_repositories r set active=false where r.workspace_id=target_workspace
    and r.installation_id=target_installation and r.github_id=any(previous_ids) and not(r.github_id=any(selected));
  return connected;
end;
$$;

create or replace function public.begin_github_discovery(requester uuid, target_workspace uuid, state_hash text,
  available_installations bigint[] default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  delete from private.github_discovery_states where expires_at < now() or (user_id=requester and workspace_id=target_workspace);
  delete from private.github_account_states where expires_at < now() or (user_id=requester and workspace_id=target_workspace);
  delete from private.github_repository_states where expires_at < now() or (user_id=requester and workspace_id=target_workspace);
  insert into private.github_discovery_states(state_hash,user_id,workspace_id,installation_ids)
    values(state_hash,requester,target_workspace,available_installations);
end;
$$;

revoke all on function public.begin_github_repository_selection(uuid,uuid,bigint,text,bigint[]),
  public.select_github_repositories(uuid,text,text,bigint[]),
  public.consume_github_repository_selection(uuid,text),
  public.save_github_repository_selection(uuid,uuid,bigint,jsonb,bigint[]) from public, anon, authenticated;
grant execute on function public.begin_github_repository_selection(uuid,uuid,bigint,text,bigint[]),
  public.select_github_repositories(uuid,text,text,bigint[]),
  public.consume_github_repository_selection(uuid,text),
  public.save_github_repository_selection(uuid,uuid,bigint,jsonb,bigint[]) to service_role;
