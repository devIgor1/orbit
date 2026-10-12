-- A single onboarding flow: repository consent on GitHub, then identity proof.
-- No GitHub access tokens or browser-provided installation IDs are trusted here.
create table private.github_account_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  installation_id bigint check (installation_id > 0),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
revoke all on private.github_account_states from public, anon, authenticated;

create function public.begin_github_account_connection(requester uuid, target_workspace uuid, state_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  delete from private.github_account_states where expires_at < now()
    or (user_id = requester and workspace_id = target_workspace);
  insert into private.github_account_states(state_hash,user_id,workspace_id)
    values(state_hash,requester,target_workspace);
end;
$$;

create function public.advance_github_account_connection(requester uuid, previous_hash text, next_hash text, target_installation bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare pending private.github_account_states;
begin
  if target_installation is null or target_installation <= 0 then
    raise exception 'Invalid installation' using errcode = '22023';
  end if;
  delete from private.github_account_states where state_hash = previous_hash
    and user_id = requester and expires_at > now() and installation_id is null returning * into pending;
  if not found then raise exception 'Invalid OAuth state' using errcode = '22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  -- Merely a claim to verify with a user token after OAuth; never connects a repo.
  insert into private.github_account_states(state_hash,user_id,workspace_id,installation_id)
    values(next_hash,requester,pending.workspace_id,target_installation);
end;
$$;

create function public.consume_github_account_connection(requester uuid, state_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pending private.github_account_states;
begin
  delete from private.github_account_states s where s.state_hash = consume_github_account_connection.state_hash
    and s.user_id = requester and s.expires_at > now() and s.installation_id is not null returning * into pending;
  if not found then raise exception 'Invalid OAuth state' using errcode = '22023'; end if;
  if private.require_active_member(pending.workspace_id,requester) <> 'admin' then raise insufficient_privilege; end if;
  return jsonb_build_object('workspace_id',pending.workspace_id,'installation_id',pending.installation_id);
end;
$$;

create function public.finish_github_account_connection(requester uuid, target_workspace uuid, repositories jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare repository jsonb; connected integer := 0;
begin
  -- Serialize against membership removal/demotion until the whole batch commits.
  perform 1 from public.workspaces where id = target_workspace for update;
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  if jsonb_typeof(repositories) is distinct from 'array' then
    raise exception 'Invalid repositories' using errcode = '22023';
  end if;
  if jsonb_array_length(repositories) not between 1 and 1000 then
    raise exception 'Invalid repositories' using errcode = '22023';
  end if;
  for repository in select value from jsonb_array_elements(repositories) loop
    perform public.finish_github_connection(requester,target_workspace,repository);
    connected := connected + 1;
  end loop;
  return connected;
end;
$$;

revoke all on function public.begin_github_account_connection(uuid,uuid,text),
  public.advance_github_account_connection(uuid,text,text,bigint),
  public.consume_github_account_connection(uuid,text),
  public.finish_github_account_connection(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.begin_github_account_connection(uuid,uuid,text),
  public.advance_github_account_connection(uuid,text,text,bigint),
  public.consume_github_account_connection(uuid,text),
  public.finish_github_account_connection(uuid,uuid,jsonb) to service_role;
