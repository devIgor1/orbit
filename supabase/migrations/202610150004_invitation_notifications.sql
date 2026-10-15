-- Invitations belong to the confirmed account, even before workspace membership.
-- The channel only carries invalidations; my_invitations rechecks the email and
-- invitation status/expiration on every read, including after an email change.
create policy invitation_broadcast_receive on realtime.messages
  for select to authenticated using (
    extension = 'broadcast'
    and realtime.topic() = 'invitations:' || (select auth.uid())::text
  );

create function private.broadcast_invitation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous_email text;
  current_email text;
  recipient uuid;
begin
  if tg_op <> 'INSERT' then previous_email := old.email; end if;
  if tg_op <> 'DELETE' then current_email := new.email; end if;
  -- Delivery tracking does not change the pending invitation inbox.
  if tg_op = 'UPDATE' and (new.email, new.status, new.expires_at)
    is not distinct from (old.email, old.status, old.expires_at) then return null; end if;
  for recipient in
    select distinct u.id from auth.users u
    where u.email_confirmed_at is not null
      and lower(u.email) in (previous_email, current_email)
  loop
    perform realtime.send('{}'::jsonb, 'invitations_changed', 'invitations:' || recipient::text, true);
  end loop;
  return null;
end;
$$;
revoke all on function private.broadcast_invitation_change() from public, anon, authenticated;
create trigger invitation_broadcast after insert or update or delete on public.workspace_invitations
  for each row execute function private.broadcast_invitation_change();
