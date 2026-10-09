create table public.workspace_member_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  member_id uuid references public.profiles(id) on delete set null,
  member_name text not null,
  action text not null check(action in ('role_changed','removed')),
  previous_role public.member_role not null,
  new_role public.member_role,
  reassigned_to uuid references public.profiles(id) on delete set null,
  reassigned_name text,
  affected_tasks integer not null default 0 check(affected_tasks >= 0),
  created_at timestamptz not null default now(),
  check ((action = 'role_changed') = (new_role is not null))
);
create index member_events_workspace on public.workspace_member_events(workspace_id, created_at desc, id);
alter table public.workspace_member_events enable row level security;
revoke all on public.workspace_member_events from public, anon, authenticated;
grant select on public.workspace_member_events to authenticated;
create policy member_events_select on public.workspace_member_events for select to authenticated
  using(private.is_admin(workspace_id));

create function public.member_management_details(target_workspace uuid, target_user uuid)
returns table(user_id uuid, full_name text, role public.member_role, pending_tasks bigint, is_last_admin boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(target_workspace) then raise exception 'Administrator required' using errcode = '42501'; end if;
  return query select m.user_id, p.full_name, m.role,
    (select count(*) from public.tasks t where t.workspace_id = target_workspace and t.assignee_id = m.user_id and t.status <> 'done'),
    m.role = 'admin' and (select count(*) from public.workspace_members a
      where a.workspace_id = target_workspace and a.role = 'admin' and a.removed_at is null) = 1
  from public.workspace_members m join public.profiles p on p.id = m.user_id
  where m.workspace_id = target_workspace and m.user_id = target_user and m.removed_at is null;
  if not found then raise exception 'Member unavailable' using errcode = 'PT404'; end if;
end;
$$;

create function private.check_member_change(target_workspace uuid, target_user uuid, expected_role public.member_role)
returns public.workspace_members language plpgsql security definer set search_path = '' as $$
declare membership public.workspace_members;
begin
  perform private.lock_member_administration(target_workspace);
  select * into membership from public.workspace_members
    where workspace_id = target_workspace and user_id = target_user for update;
  if not found or membership.removed_at is not null then raise exception 'Member unavailable' using errcode = 'PT404'; end if;
  if expected_role is null or membership.role <> expected_role then raise exception 'Membership changed' using errcode = 'PT409'; end if;
  return membership;
end;
$$;
create function private.protect_last_admin(target_workspace uuid, existing_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if existing_role = 'admin' and (select count(*) from public.workspace_members
    where workspace_id = target_workspace and role = 'admin' and removed_at is null) <= 1 then
    raise exception 'Last administrator' using errcode = 'PT412';
  end if;
end;
$$;
revoke all on function private.check_member_change(uuid,uuid,public.member_role),
  private.protect_last_admin(uuid,public.member_role) from public, anon, authenticated;

create function public.change_member_role(target_workspace uuid, target_user uuid,
  expected_role public.member_role, new_role public.member_role)
returns public.workspace_member_events language plpgsql security definer set search_path = '' as $$
declare membership public.workspace_members; event public.workspace_member_events;
begin
  membership = private.check_member_change(target_workspace, target_user, expected_role);
  if new_role is null or new_role = membership.role then raise exception 'Choose a different role' using errcode = '22023'; end if;
  if new_role <> 'admin' then perform private.protect_last_admin(target_workspace, membership.role); end if;
  update public.workspace_members set role = new_role where workspace_id = target_workspace and user_id = target_user;
  insert into public.workspace_member_events(workspace_id,actor_id,actor_name,member_id,member_name,action,previous_role,new_role)
  values(target_workspace,auth.uid(),(select full_name from public.profiles where id=auth.uid()),target_user,
    (select full_name from public.profiles where id=target_user),'role_changed',membership.role,new_role) returning * into event;
  return event;
end;
$$;

create function public.remove_workspace_member(target_workspace uuid, target_user uuid,
  expected_role public.member_role, expected_pending_tasks bigint, replacement_user uuid default null)
returns public.workspace_member_events language plpgsql security definer set search_path = '' as $$
declare membership public.workspace_members; task_count bigint; affected integer; event public.workspace_member_events;
begin
  membership = private.check_member_change(target_workspace, target_user, expected_role);
  perform private.protect_last_admin(target_workspace, membership.role);
  if replacement_user = target_user then raise exception 'Invalid replacement' using errcode = '22023'; end if;
  if replacement_user is not null then perform private.require_active_member(target_workspace, replacement_user); end if;
  -- Lock pending assignments so the preview count and resulting transfer agree.
  perform 1 from public.tasks where workspace_id = target_workspace and assignee_id = target_user and status <> 'done' for update;
  select count(*) into task_count from public.tasks
    where workspace_id = target_workspace and assignee_id = target_user and status <> 'done';
  if expected_pending_tasks is null or task_count <> expected_pending_tasks then
    raise exception 'Task count changed' using errcode = 'PT409';
  end if;
  update public.tasks set assignee_id = replacement_user
    where workspace_id = target_workspace and assignee_id = target_user and status <> 'done';
  get diagnostics affected = row_count;
  update public.workspace_members set removed_at = now() where workspace_id = target_workspace and user_id = target_user;
  update public.profiles set active_workspace_id = null where id = target_user and active_workspace_id = target_workspace;
  update public.workspace_invitations set status = 'revoked'
    where workspace_id = target_workspace and status = 'pending' and email = (select lower(email) from auth.users where id = target_user);
  insert into public.workspace_member_events(workspace_id,actor_id,actor_name,member_id,member_name,action,previous_role,
    reassigned_to,reassigned_name,affected_tasks)
  values(target_workspace,auth.uid(),(select full_name from public.profiles where id=auth.uid()),target_user,
    (select full_name from public.profiles where id=target_user),'removed',membership.role,replacement_user,
    (select full_name from public.profiles where id=replacement_user),affected) returning * into event;
  return event;
end;
$$;
revoke all on function public.member_management_details(uuid,uuid),
  public.change_member_role(uuid,uuid,public.member_role,public.member_role),
  public.remove_workspace_member(uuid,uuid,public.member_role,bigint,uuid) from public, anon;
grant execute on function public.member_management_details(uuid,uuid),
  public.change_member_role(uuid,uuid,public.member_role,public.member_role),
  public.remove_workspace_member(uuid,uuid,public.member_role,bigint,uuid) to authenticated;
