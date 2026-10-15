create type public.notification_kind as enum ('assigned', 'commented', 'status_changed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  event_id uuid not null,
  kind public.notification_kind not null,
  project_id uuid not null,
  task_id uuid not null,
  task_title text not null,
  task_status public.task_status,
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz,
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, task_id) references public.tasks(workspace_id, id) on delete cascade,
  unique (recipient_id, event_id, kind),
  check ((kind = 'status_changed') = (task_status is not null))
);
create index notifications_inbox on public.notifications(recipient_id, workspace_id, created_at desc, id desc);
create index notifications_unread on public.notifications(recipient_id, workspace_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and private.is_member(workspace_id));

-- A single statement supplies the page and its count from the same snapshot.
create function public.notification_inbox(target_workspace uuid, unread_only boolean default false,
  before_time timestamptz default null, before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(target_workspace) then
    raise exception 'Workspace unavailable' using errcode = '42501';
  end if;
  if (before_time is null) <> (before_id is null) or unread_only is null then
    raise exception 'Invalid notification cursor' using errcode = '22023';
  end if;
  return (
    with page as (
      select n.* from public.notifications n
      where n.workspace_id = target_workspace and n.recipient_id = auth.uid()
        and (not unread_only or n.read_at is null)
        and (before_time is null or (n.created_at, n.id) < (before_time, before_id))
      order by n.created_at desc, n.id desc limit 21
    ), visible as (select * from page order by created_at desc, id desc limit 20)
    select jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc, v.id desc) from visible v), '[]'::jsonb),
      'has_more', (select count(*) > 20 from page),
      'unread_count', (select count(*) from public.notifications n
        where n.workspace_id = target_workspace and n.recipient_id = auth.uid() and n.read_at is null),
      'as_of', statement_timestamp()
    )
  );
end;
$$;

create function public.mark_notification_read(target_workspace uuid, notification_id uuid)
returns public.notifications language plpgsql security definer set search_path = '' as $$
declare result public.notifications;
begin
  if not private.is_member(target_workspace) then
    raise exception 'Workspace unavailable' using errcode = '42501';
  end if;
  update public.notifications set read_at = coalesce(read_at, clock_timestamp())
  where id = notification_id and workspace_id = target_workspace and recipient_id = auth.uid()
  returning * into result;
  if not found then raise exception 'Notification unavailable' using errcode = '42501'; end if;
  return result;
end;
$$;

-- The snapshot boundary keeps notifications arriving after the click unread.
create function public.mark_all_notifications_read(target_workspace uuid, through_time timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if not private.is_member(target_workspace) then
    raise exception 'Workspace unavailable' using errcode = '42501';
  end if;
  if through_time is null or through_time > clock_timestamp() then
    raise exception 'Invalid notification boundary' using errcode = '22023';
  end if;
  update public.notifications set read_at = clock_timestamp()
  where workspace_id = target_workspace and recipient_id = auth.uid()
    and read_at is null and created_at <= through_time;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.notification_inbox(uuid, boolean, timestamptz, uuid),
  public.mark_notification_read(uuid, uuid), public.mark_all_notifications_read(uuid, timestamptz) from public, anon;
grant execute on function public.notification_inbox(uuid, boolean, timestamptz, uuid),
  public.mark_notification_read(uuid, uuid), public.mark_all_notifications_read(uuid, timestamptz) to authenticated;
