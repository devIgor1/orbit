-- Repository selection can involve organization approval or installation settings.
-- Allow more time for that stage; OAuth still gets its separate 10-minute state.
create or replace function public.begin_github_account_connection(requester uuid, target_workspace uuid, state_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.require_active_member(target_workspace,requester) <> 'admin' then raise insufficient_privilege; end if;
  delete from private.github_account_states where expires_at < now()
    or (user_id = requester and workspace_id = target_workspace);
  insert into private.github_account_states(state_hash,user_id,workspace_id,expires_at)
    values(state_hash,requester,target_workspace,now() + interval '30 minutes');
end;
$$;

revoke all on function public.begin_github_account_connection(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.begin_github_account_connection(uuid,uuid,text) to service_role;
