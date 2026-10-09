create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  check ((status = 'accepted') = (accepted_at is not null))
);
create unique index invitation_pending_email on public.workspace_invitations(workspace_id, email) where status = 'pending';
create index invitations_email on public.workspace_invitations(email, status);
alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon, authenticated;
grant select on public.workspace_invitations to authenticated;
create policy invitations_select on public.workspace_invitations for select to authenticated
using (private.is_admin(workspace_id) or email = private.confirmed_email());

create function public.invite_collaborator(target_workspace uuid, invite_email text)
returns public.workspace_invitations language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations;
begin
  if not private.is_admin(target_workspace) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if exists(select 1 from public.workspace_members m join auth.users u on u.id = m.user_id
    where m.workspace_id = target_workspace and lower(u.email) = lower(trim(invite_email))) then
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

create function public.revoke_invitation(invitation_id uuid) returns public.workspace_invitations
language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations;
begin
  select * into invitation from public.workspace_invitations where id = invitation_id for update;
  if not found or not private.is_admin(invitation.workspace_id) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if invitation.status <> 'pending' then
    raise exception 'Invitation no longer pending' using errcode = 'PT410';
  end if;
  update public.workspace_invitations set status = 'revoked' where id = invitation_id returning * into invitation;
  return invitation;
end;
$$;

-- Read company names for invitations without exposing other workspace data.
create function public.my_invitations()
returns table(id uuid, workspace_name text, email text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, w.name, i.email, i.expires_at
  from public.workspace_invitations i join public.workspaces w on w.id = i.workspace_id
  where i.email = private.confirmed_email() and i.status = 'pending' and i.expires_at > now()
  order by i.created_at desc, i.id;
$$;

create function public.accept_invitation(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.workspace_invitations;
begin
  select * into invitation from public.workspace_invitations where id = invitation_id for update;
  if not found or private.confirmed_email() is null or invitation.email <> private.confirmed_email() then
    raise exception 'Invitation unavailable for this account' using errcode = '42501';
  end if;
  if invitation.status = 'accepted' and invitation.accepted_by = auth.uid()
    and private.is_member(invitation.workspace_id) then
    perform public.select_company(invitation.workspace_id);
    return invitation.workspace_id;
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'Invitation expired or revoked' using errcode = 'PT410';
  end if;
  -- Never allow the invitee to choose a role or elevate an existing membership.
  insert into public.workspace_members(workspace_id, user_id, role)
  values(invitation.workspace_id, auth.uid(), 'member') on conflict do nothing;
  update public.workspace_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;
  perform public.select_company(invitation.workspace_id);
  return invitation.workspace_id;
end;
$$;

revoke all on function public.invite_collaborator(uuid,text), public.revoke_invitation(uuid),
  public.my_invitations(), public.accept_invitation(uuid) from public, anon;
grant execute on function public.invite_collaborator(uuid,text), public.revoke_invitation(uuid),
  public.my_invitations(), public.accept_invitation(uuid) to authenticated;
