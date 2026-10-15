-- Authorize only the recipient's private workspace channel. No client send policy.
create policy notification_broadcast_receive on realtime.messages
  for select to authenticated using (
    extension = 'broadcast' and exists (
      select 1 from public.workspace_members m
      where m.user_id = (select auth.uid()) and m.removed_at is null
        and realtime.topic() = 'notifications:' || m.workspace_id::text || ':' || m.user_id::text
    )
  );

create function private.broadcast_notification_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare item public.notifications;
begin
  if tg_op = 'DELETE' then item := old; else item := new; end if;
  if tg_op = 'UPDATE' and new.read_at is not distinct from old.read_at then return new; end if;
  -- No business data goes over the socket. Every refresh rechecks table/RPC access,
  -- including for a membership revoked after the channel was authorized.
  perform realtime.send('{}'::jsonb, 'inbox_changed',
    'notifications:' || item.workspace_id::text || ':' || item.recipient_id::text, true);
  return item;
end;
$$;
revoke all on function private.broadcast_notification_change() from public, anon, authenticated;
create trigger notification_broadcast after insert or update or delete on public.notifications
  for each row execute function private.broadcast_notification_change();
