-- Trash: companies, projects and tasks are removed by administrators and kept for
-- 15 days, hidden from every regular read. Within that window they can be restored;
-- afterwards (or on request) they are deleted permanently with their dependents.
alter table public.workspaces
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete set null;
alter table public.projects
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete set null;
alter table public.tasks
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete set null;
create index workspaces_trash on public.workspaces(deleted_at) where deleted_at is not null;
create index projects_trash on public.projects(workspace_id, deleted_at) where deleted_at is not null;
create index tasks_trash on public.tasks(workspace_id, deleted_at) where deleted_at is not null;

create function private.trash_retention() returns interval language sql immutable as $$ select interval '15 days' $$;
revoke all on function private.trash_retention() from public;
grant execute on function private.trash_retention() to authenticated;

-- A company in the trash grants no access to anyone until it is restored.
create or replace function private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = target and m.user_id = auth.uid() and m.removed_at is null and w.deleted_at is null);
$$;
create or replace function private.is_admin(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = target and m.user_id = auth.uid() and m.role = 'admin' and m.removed_at is null
      and w.deleted_at is null);
$$;
create or replace function private.require_active_member(target_workspace uuid, target_user uuid)
returns public.member_role language plpgsql security definer set search_path = '' as $$
declare membership public.workspace_members;
begin
  select * into membership from public.workspace_members
    where workspace_id = target_workspace and user_id = target_user for share;
  if not found or membership.removed_at is not null
    or exists(select 1 from public.workspaces where id = target_workspace and deleted_at is not null) then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  return membership.role;
end;
$$;

create function private.project_active(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.projects p join public.workspaces w on w.id = p.workspace_id
    where p.id = target and p.deleted_at is null and w.deleted_at is null);
$$;
create function private.task_active(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.tasks t join public.projects p on p.id = t.project_id
    join public.workspaces w on w.id = t.workspace_id
    where t.id = target and t.deleted_at is null and p.deleted_at is null and w.deleted_at is null);
$$;
revoke all on function private.project_active(uuid), private.task_active(uuid) from public;
grant execute on function private.project_active(uuid), private.task_active(uuid) to authenticated;

-- Regular reads and writes never see items in the trash.
drop policy projects_select on public.projects;
drop policy projects_update on public.projects;
drop policy tasks_select on public.tasks;
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;
drop policy comments_select on public.task_comments;
drop policy comments_insert on public.task_comments;
drop policy activity_select on public.activity_events;
drop policy notifications_select on public.notifications;
drop policy project_github_read on public.project_github_repositories;
drop policy task_github_read on public.task_github_links;
create policy projects_select on public.projects for select to authenticated
  using (private.is_member(workspace_id) and deleted_at is null);
create policy projects_update on public.projects for update to authenticated
  using (private.is_admin(workspace_id) and deleted_at is null) with check (private.is_admin(workspace_id));
create policy tasks_select on public.tasks for select to authenticated
  using (private.is_member(workspace_id) and deleted_at is null and private.project_active(project_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.is_member(workspace_id) and created_by = (select auth.uid()) and private.project_active(project_id));
create policy tasks_update on public.tasks for update to authenticated
  using (private.is_member(workspace_id) and deleted_at is null and private.project_active(project_id))
  with check (private.is_member(workspace_id));
create policy comments_select on public.task_comments for select to authenticated
  using (private.is_member(workspace_id) and private.task_active(task_id));
create policy comments_insert on public.task_comments for insert to authenticated
  with check (private.is_member(workspace_id) and author_id = (select auth.uid()) and private.task_active(task_id));
create policy activity_select on public.activity_events for select to authenticated
  using (private.is_member(workspace_id)
    and (project_id is null or private.project_active(project_id))
    and (task_id is null or private.task_active(task_id)));
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and private.is_member(workspace_id) and private.task_active(task_id));
create policy project_github_read on public.project_github_repositories for select to authenticated
  using (private.is_member(workspace_id) and private.project_active(project_id));
create policy task_github_read on public.task_github_links for select to authenticated
  using (private.is_member(workspace_id) and private.task_active(task_id));

-- Moving to and from the trash is recorded in the history.
create or replace function private.record_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare kind public.activity_entity; project uuid; task uuid; label text; actor uuid; event_action text;
begin
  if tg_table_name = 'projects' then
    kind = 'project'; project = new.id; label = new.title; actor = coalesce(auth.uid(),new.created_by);
  elsif tg_table_name = 'tasks' then
    kind = 'task'; project = new.project_id; task = new.id; label = new.title; actor = coalesce(auth.uid(),new.created_by);
  else
    kind = 'comment'; task = new.task_id; actor = coalesce(auth.uid(),new.author_id);
    select t.project_id,t.title into project,label from public.tasks t where t.id = task;
  end if;
  event_action = case when kind = 'comment' then 'commented' when tg_op = 'INSERT' then 'created' else 'updated' end;
  if tg_op = 'UPDATE' and tg_table_name in ('projects','tasks') then
    if new.status <> old.status then event_action = 'status_changed'; end if;
    if new.deleted_at is distinct from old.deleted_at then
      event_action = case when new.deleted_at is null then 'restored' else 'deleted' end;
    end if;
  end if;
  if kind = 'task' and current_setting('orbit.github_sync',true) = 'on' then
    actor = null; event_action = 'github_status_changed';
  end if;
  insert into public.activity_events(workspace_id,entity_type,entity_id,project_id,task_id,action,title,actor_id)
    values(new.workspace_id,kind,new.id,project,task,event_action,label,actor);
  return new;
end;
$$;

-- Permanent removal: dependents (tasks, comments, history, notifications and
-- GitHub links) follow the existing cascades.
create function private.purge_expired_trash() returns void
language sql security definer set search_path = '' as $$
  -- Projects go first: their tasks reference memberships that the company removes.
  delete from public.projects where workspace_id in
    (select id from public.workspaces where deleted_at < now() - private.trash_retention());
  delete from public.workspaces where deleted_at < now() - private.trash_retention();
  delete from public.projects where deleted_at < now() - private.trash_retention();
  delete from public.tasks where deleted_at < now() - private.trash_retention();
$$;
revoke all on function private.purge_expired_trash() from public, anon, authenticated;

create function public.delete_project(target_workspace uuid, target_project uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  update public.projects set deleted_at = now(), deleted_by = auth.uid()
    where id = target_project and workspace_id = target_workspace and deleted_at is null;
  if not found then raise insufficient_privilege; end if;
  return target_project;
end;
$$;
create function public.delete_task(target_workspace uuid, target_task uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  if not private.task_active(target_task) then raise insufficient_privilege; end if;
  update public.tasks set deleted_at = now(), deleted_by = auth.uid()
    where id = target_task and workspace_id = target_workspace and deleted_at is null;
  if not found then raise insufficient_privilege; end if;
  return target_task;
end;
$$;
create function public.restore_project(target_workspace uuid, target_project uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  perform private.purge_expired_trash();
  update public.projects set deleted_at = null, deleted_by = null
    where id = target_project and workspace_id = target_workspace and deleted_at is not null;
  if not found then raise exception 'Not in trash' using errcode = 'P0002'; end if;
  return target_project;
end;
$$;
create function public.restore_task(target_workspace uuid, target_task uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare task public.tasks;
begin
  perform private.lock_member_administration(target_workspace);
  perform private.purge_expired_trash();
  select * into task from public.tasks
    where id = target_task and workspace_id = target_workspace and deleted_at is not null for update;
  if not found then raise exception 'Not in trash' using errcode = 'P0002'; end if;
  if not private.project_active(task.project_id) then
    raise exception 'Restore the project first' using errcode = '55000';
  end if;
  update public.tasks set deleted_at = null, deleted_by = null where id = target_task;
  return target_task;
end;
$$;
create function public.purge_project(target_workspace uuid, target_project uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  delete from public.projects where id = target_project and workspace_id = target_workspace and deleted_at is not null;
  if not found then raise exception 'Not in trash' using errcode = 'P0002'; end if;
  return target_project;
end;
$$;
create function public.purge_task(target_workspace uuid, target_task uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  delete from public.tasks where id = target_task and workspace_id = target_workspace and deleted_at is not null;
  if not found then raise exception 'Not in trash' using errcode = 'P0002'; end if;
  return target_task;
end;
$$;

-- Trash contents. Tasks of a project in the trash travel with the project.
create function public.trash_items(target_workspace uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(target_workspace) then raise exception 'Administrator required' using errcode = '42501'; end if;
  perform private.purge_expired_trash();
  return jsonb_build_object(
    'projects', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'deleted_at', p.deleted_at,
        'deleted_by', (select f.full_name from public.profiles f where f.id = p.deleted_by),
        'purge_at', p.deleted_at + private.trash_retention(),
        'task_count', (select count(*) from public.tasks t where t.project_id = p.id))
      order by p.deleted_at desc, p.id)
      from public.projects p where p.workspace_id = target_workspace and p.deleted_at is not null), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'project_id', t.project_id, 'project_title', p.title,
        'deleted_at', t.deleted_at,
        'deleted_by', (select f.full_name from public.profiles f where f.id = t.deleted_by),
        'purge_at', t.deleted_at + private.trash_retention())
      order by t.deleted_at desc, t.id)
      from public.tasks t join public.projects p on p.id = t.project_id
      where t.workspace_id = target_workspace and t.deleted_at is not null and p.deleted_at is null), '[]'::jsonb)
  );
end;
$$;

create function public.rename_company(target_workspace uuid, company_name text) returns public.workspaces
language plpgsql security definer set search_path = '' as $$
declare company public.workspaces;
begin
  perform private.lock_member_administration(target_workspace);
  if company_name is null or char_length(trim(company_name)) not between 2 and 100 then
    raise exception 'Invalid company name' using errcode = '22023';
  end if;
  update public.workspaces set name = trim(company_name) where id = target_workspace returning * into company;
  return company;
end;
$$;
create function public.delete_company(target_workspace uuid, confirmation text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_member_administration(target_workspace);
  if trim(confirmation) is distinct from (select name from public.workspaces where id = target_workspace) then
    raise exception 'Confirmation does not match' using errcode = '22023';
  end if;
  update public.workspaces set deleted_at = now(), deleted_by = auth.uid() where id = target_workspace;
  update public.workspace_invitations set status = 'revoked'
    where workspace_id = target_workspace and status = 'pending';
  update public.profiles set active_workspace_id = null where active_workspace_id = target_workspace;
  return target_workspace;
end;
$$;
-- Administrators of a company in the trash can still find and restore it.
create function public.deleted_companies()
returns table(id uuid, name text, deleted_at timestamptz, purge_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.purge_expired_trash();
  return query select w.id, w.name, w.deleted_at, w.deleted_at + private.trash_retention()
    from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
    where w.deleted_at is not null and m.user_id = auth.uid() and m.role = 'admin' and m.removed_at is null
    order by w.deleted_at desc, w.id;
end;
$$;
create function public.restore_company(target_workspace uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform private.purge_expired_trash();
  perform 1 from public.workspaces where id = target_workspace and deleted_at is not null for update;
  if not found then raise exception 'Not in trash' using errcode = 'P0002'; end if;
  if not exists(select 1 from public.workspace_members where workspace_id = target_workspace
    and user_id = auth.uid() and role = 'admin' and removed_at is null) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  update public.workspaces set deleted_at = null, deleted_by = null where id = target_workspace;
  update public.profiles set active_workspace_id = target_workspace where id = auth.uid();
  return target_workspace;
end;
$$;

revoke all on function public.delete_project(uuid,uuid), public.delete_task(uuid,uuid),
  public.restore_project(uuid,uuid), public.restore_task(uuid,uuid), public.purge_project(uuid,uuid),
  public.purge_task(uuid,uuid), public.trash_items(uuid), public.rename_company(uuid,text),
  public.delete_company(uuid,text), public.deleted_companies(), public.restore_company(uuid)
  from public, anon;
grant execute on function public.delete_project(uuid,uuid), public.delete_task(uuid,uuid),
  public.restore_project(uuid,uuid), public.restore_task(uuid,uuid), public.purge_project(uuid,uuid),
  public.purge_task(uuid,uuid), public.trash_items(uuid), public.rename_company(uuid,text),
  public.delete_company(uuid,text), public.deleted_companies(), public.restore_company(uuid)
  to authenticated;

-- Background work ignores items in the trash; it resumes if they are restored.
create or replace function public.claim_github_jobs() returns jsonb language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links; job private.github_sync_jobs; result jsonb = '[]'; repo public.github_repositories;
begin
  for link in select l.* from public.task_github_links l join private.github_sync_jobs j on j.link_id = l.id
    join public.github_repositories r on r.id = l.repository_id
    where r.active and j.due_at <= now() and (j.lease_until is null or j.lease_until < now())
      and private.task_active(l.task_id)
    order by j.due_at limit 10 for update of l skip locked
  loop
    update private.github_sync_jobs set lease = gen_random_uuid(),lease_until = now() + interval '5 minutes'
      where link_id = link.id returning * into job;
    select * into repo from public.github_repositories where id = link.repository_id;
    result = result || jsonb_build_array(jsonb_build_object('link',to_jsonb(link),'repository',to_jsonb(repo),
      'lease',job.lease,'generation',job.generation));
  end loop;
  return result;
end;
$$;

create or replace function public.link_task_github(requester uuid, target_workspace uuid,
  target_task uuid, target_repository uuid, development jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare task public.tasks; result uuid; repo public.github_repositories;
begin
  perform private.require_active_member(target_workspace,requester);
  select * into task from public.tasks where id=target_task and workspace_id=target_workspace for update;
  if not found or not private.task_active(target_task) then raise insufficient_privilege; end if;
  if not exists(select 1 from public.project_github_repositories p where p.workspace_id=target_workspace
    and p.project_id=task.project_id and p.repository_id=target_repository) then
    raise exception 'Repository is not the project repository' using errcode='22023';
  end if;
  -- The row lock serializes linking with repository disconnect/selection updates.
  select * into repo from public.github_repositories
    where id=target_repository and workspace_id=target_workspace and active for share;
  if not found then raise insufficient_privilege; end if;
  insert into public.task_github_links(workspace_id,project_id,task_id,repository_id,branch,head_repository_id,pr_number,pr_state,created_by)
    values(target_workspace,task.project_id,target_task,target_repository,development->>'branch',
      (development->>'head_repository_id')::bigint,(development->>'pr_number')::integer,
      case when development->>'pr_number' is null then 'branch' else 'open' end,requester) returning id into result;
  insert into private.github_sync_jobs(link_id) values(result);
  insert into public.activity_events(workspace_id,entity_type,entity_id,project_id,task_id,action,title,actor_id)
    values(target_workspace,'task',target_task,task.project_id,target_task,'github_linked',task.title,requester);
  return result;
end;
$$;

-- Notifications about items in the trash stay hidden until they are restored.
create or replace function public.notification_inbox(target_workspace uuid, unread_only boolean default false,
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
        and (not unread_only or n.read_at is null) and private.task_active(n.task_id)
        and (before_time is null or (n.created_at, n.id) < (before_time, before_id))
      order by n.created_at desc, n.id desc limit 21
    ), visible as (select * from page order by created_at desc, id desc limit 20)
    select jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc, v.id desc) from visible v), '[]'::jsonb),
      'has_more', (select count(*) > 20 from page),
      'unread_count', (select count(*) from public.notifications n
        where n.workspace_id = target_workspace and n.recipient_id = auth.uid() and n.read_at is null
          and private.task_active(n.task_id)),
      'as_of', statement_timestamp()
    )
  );
end;
$$;
