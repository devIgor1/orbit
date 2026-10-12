-- Discovery and account choice store only state hashes and GitHub IDs, never tokens.
create table private.github_discovery_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  installation_ids bigint[], -- NULL while awaiting OAuth; populated after discovery.
  expires_at timestamptz not null default now() + interval '10 minutes',
  check (installation_ids is null or (cardinality(installation_ids) between 1 and 1000
    and array_position(installation_ids,null) is null and 0 < all(installation_ids)))
);
revoke all on private.github_discovery_states from public, anon, authenticated;

create function public.begin_github_discovery(requester uuid, target_workspace uuid, state_hash text,
  available_installations bigint[] default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  delete from private.github_discovery_states where expires_at < now()
    or (user_id = requester and workspace_id = target_workspace);
  delete from private.github_account_states where expires_at < now()
    or (user_id = requester and workspace_id = target_workspace);
  insert into private.github_discovery_states(state_hash,user_id,workspace_id,installation_ids)
    values(state_hash,requester,target_workspace,available_installations);
end;
$$;

create function public.consume_github_discovery(requester uuid, state_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pending private.github_discovery_states;
begin
  delete from private.github_discovery_states s where s.state_hash = consume_github_discovery.state_hash
    and s.user_id = requester and s.expires_at > now() and s.installation_ids is null returning * into pending;
  if not found then raise exception 'Invalid OAuth state' using errcode = '22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  return pending.workspace_id;
end;
$$;

create function public.select_github_installation(requester uuid, state_hash text, next_hash text,
  target_installation bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
declare pending private.github_discovery_states;
begin
  delete from private.github_discovery_states s where s.state_hash = select_github_installation.state_hash
    and s.user_id = requester and s.expires_at > now() and s.installation_ids is not null returning * into pending;
  if not found then raise exception 'Invalid selection state' using errcode = '22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  if target_installation is not null and not (target_installation = any(pending.installation_ids)) then
    raise exception 'Invalid installation selection' using errcode = '22023';
  end if;
  -- A fresh OAuth round revalidates user access after selection. No token is persisted.
  -- NULL explicitly starts installation in another account instead.
  insert into private.github_account_states(state_hash,user_id,workspace_id,installation_id,expires_at)
    values(next_hash,requester,pending.workspace_id,target_installation,
      now() + case when target_installation is null then interval '30 minutes' else interval '10 minutes' end);
end;
$$;

revoke all on function public.begin_github_discovery(uuid,uuid,text,bigint[]),
  public.consume_github_discovery(uuid,text),
  public.select_github_installation(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.begin_github_discovery(uuid,uuid,text,bigint[]),
  public.consume_github_discovery(uuid,text),
  public.select_github_installation(uuid,text,text,bigint) to service_role;
