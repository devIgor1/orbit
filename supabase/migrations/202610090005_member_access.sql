-- End access without deleting authorship or completed assignments.
alter table public.workspace_members add column removed_at timestamptz;
create index active_workspace_members on public.workspace_members(workspace_id, role) where removed_at is null;

create or replace function private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target
    and user_id = auth.uid() and removed_at is null);
$$;
create or replace function private.is_admin(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target
    and user_id = auth.uid() and role = 'admin' and removed_at is null);
$$;
create or replace function private.is_colleague(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  -- Active readers may still resolve former authors. Former members get no access.
  select exists(select 1 from public.workspace_members mine join public.workspace_members theirs using(workspace_id)
    where mine.user_id = auth.uid() and mine.removed_at is null and theirs.user_id = target);
$$;

-- Serialize membership changes per company, then recheck the current actor.
create function private.lock_member_administration(target_workspace uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.workspaces where id = target_workspace for update;
  if not found or not private.is_admin(target_workspace) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.lock_member_administration(uuid) from public, anon, authenticated;

-- Foreign keys preserve history; this guard additionally requires active links.
create function private.require_active_member(target_workspace uuid, target_user uuid)
returns public.member_role language plpgsql security definer set search_path = '' as $$
declare membership public.workspace_members;
begin
  select * into membership from public.workspace_members
    where workspace_id = target_workspace and user_id = target_user for share;
  if not found or membership.removed_at is not null then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  return membership.role;
end;
$$;
revoke all on function private.require_active_member(uuid,uuid) from public, anon, authenticated;

create function private.validate_active_participants() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor_role public.member_role; assigned public.workspace_members;
begin
  if auth.uid() is not null then
    actor_role = private.require_active_member(new.workspace_id, auth.uid());
    if tg_table_name = 'projects' and actor_role <> 'admin' then
      raise exception 'Administrator required' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'task_comments' then
      perform private.require_active_member(new.workspace_id, new.author_id);
    else
      perform private.require_active_member(new.workspace_id, new.created_by);
    end if;
  end if;
  if tg_table_name = 'tasks' then
   if new.assignee_id is not null then
    select * into assigned from public.workspace_members
      where workspace_id = new.workspace_id and user_id = new.assignee_id for share;
    if not found or assigned.removed_at is not null then
      if tg_op = 'UPDATE' and new.assignee_id = old.assignee_id and old.status = 'done' then
        -- Keep completed attribution; reopening a former member's task unassigns it.
        if new.status <> 'done' then new.assignee_id = null; end if;
      else
        raise exception 'Assignee must be active' using errcode = '23503';
      end if;
    end if;
   end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_active_participants() from public, anon, authenticated;
create trigger active_project_participants before insert or update on public.projects
  for each row execute function private.validate_active_participants();
create trigger active_task_participants before insert or update on public.tasks
  for each row execute function private.validate_active_participants();
create trigger active_comment_participants before insert on public.task_comments
  for each row execute function private.validate_active_participants();

drop function public.team_directory(uuid,text);
create function public.team_directory(target_workspace uuid, search_term text default '', include_removed boolean default false)
returns table(id uuid, full_name text, avatar_url text, job_title text, role public.member_role,
  assigned_tasks bigint, completed_tasks bigint, is_active boolean)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_member(target_workspace) then raise insufficient_privilege using message = 'Workspace access denied'; end if;
  return query select p.id, p.full_name, p.avatar_url, p.job_title, m.role,
    (select count(*) from public.tasks t where t.workspace_id = target_workspace and t.assignee_id = p.id and t.status <> 'done'),
    (select count(*) from public.tasks t where t.workspace_id = target_workspace and t.assignee_id = p.id and t.status = 'done'),
    m.removed_at is null
  from public.workspace_members m join public.profiles p on p.id = m.user_id
  where m.workspace_id = target_workspace and (include_removed or m.removed_at is null)
    and p.full_name ilike '%' || replace(replace(search_term, '%', '\%'), '_', '\_') || '%'
  order by p.full_name, p.id;
end;
$$;
revoke all on function public.team_directory(uuid,text,boolean) from public, anon;
grant execute on function public.team_directory(uuid,text,boolean) to authenticated;
