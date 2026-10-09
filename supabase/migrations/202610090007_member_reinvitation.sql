-- Reinviting a former member requires a fresh, valid invitation. Old accepted
-- links cannot restore a removed membership, and reentry always starts as member.
create or replace function public.invite_collaborator(target_workspace uuid, invite_email text)
returns public.workspace_invitations language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations;
begin
  perform private.lock_member_administration(target_workspace);
  if exists(select 1 from public.workspace_members m join auth.users u on u.id = m.user_id
    where m.workspace_id = target_workspace and m.removed_at is null and lower(u.email) = lower(trim(invite_email))) then
    raise exception 'Already a member' using errcode = 'PT409';
  end if;
  insert into public.workspace_invitations(workspace_id, email, created_by)
  values(target_workspace, lower(trim(invite_email)), auth.uid())
  on conflict(workspace_id, email) where status = 'pending'
  do update set expires_at = now() + interval '7 days', created_by = auth.uid()
  returning * into invitation;
  return invitation;
end;
$$;

create or replace function public.accept_invitation(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations;
begin
  select * into invitation from public.workspace_invitations where id = invitation_id;
  if not found or private.confirmed_email() is null or invitation.email <> private.confirmed_email() then
    raise exception 'Invitation unavailable for this account' using errcode = '42501';
  end if;
  -- Same lock order as member management: company, then invitation/membership.
  perform 1 from public.workspaces where id = invitation.workspace_id for update;
  select * into invitation from public.workspace_invitations where id = invitation_id for update;
  if invitation.status = 'accepted' and invitation.accepted_by = auth.uid() and private.is_member(invitation.workspace_id) then
    perform public.select_company(invitation.workspace_id);
    return invitation.workspace_id;
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'Invitation expired or revoked' using errcode = 'PT410';
  end if;
  insert into public.workspace_members(workspace_id, user_id, role)
  values(invitation.workspace_id, auth.uid(), 'member')
  on conflict(workspace_id,user_id) do update set role = 'member', removed_at = null
    where public.workspace_members.removed_at is not null;
  update public.workspace_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  perform public.select_company(invitation.workspace_id);
  return invitation.workspace_id;
end;
$$;
