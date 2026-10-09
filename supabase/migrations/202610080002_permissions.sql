create function private.is_member(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target and user_id = auth.uid());
$$;
create function private.is_admin(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members where workspace_id = target and user_id = auth.uid() and role = 'admin');
$$;
create function private.is_colleague(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members mine join public.workspace_members theirs using (workspace_id)
    where mine.user_id = auth.uid() and theirs.user_id = target);
$$;
revoke all on function private.is_member(uuid), private.is_admin(uuid), private.is_colleague(uuid) from public;
grant execute on function private.is_member(uuid), private.is_admin(uuid), private.is_colleague(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.activity_events enable row level security;

revoke all on public.profiles, public.workspaces, public.workspace_members, public.projects, public.tasks, public.task_comments, public.activity_events from anon, authenticated;
grant select on public.profiles, public.workspaces, public.workspace_members, public.projects, public.tasks, public.task_comments, public.activity_events to authenticated;
grant update(full_name, avatar_url, job_title) on public.profiles to authenticated;
grant insert(workspace_id, title, description, status, due_date, created_by) on public.projects to authenticated;
grant update(title, description, status, due_date) on public.projects to authenticated;
grant insert(workspace_id, project_id, title, description, status, priority, assignee_id, due_date, created_by) on public.tasks to authenticated;
grant update(title, description, status, priority, assignee_id, due_date) on public.tasks to authenticated;
grant insert(workspace_id, task_id, author_id, body) on public.task_comments to authenticated;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_colleague(id));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy workspaces_select on public.workspaces for select to authenticated using (private.is_member(id));
create policy members_select on public.workspace_members for select to authenticated using (private.is_member(workspace_id));
create policy projects_select on public.projects for select to authenticated using (private.is_member(workspace_id));
create policy projects_insert on public.projects for insert to authenticated with check (private.is_admin(workspace_id) and created_by = (select auth.uid()));
create policy projects_update on public.projects for update to authenticated using (private.is_admin(workspace_id)) with check (private.is_admin(workspace_id));
create policy tasks_select on public.tasks for select to authenticated using (private.is_member(workspace_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (private.is_member(workspace_id) and created_by = (select auth.uid()));
create policy tasks_update on public.tasks for update to authenticated using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy comments_select on public.task_comments for select to authenticated using (private.is_member(workspace_id));
create policy comments_insert on public.task_comments for insert to authenticated with check (private.is_member(workspace_id) and author_id = (select auth.uid()));
create policy activity_select on public.activity_events for select to authenticated using (private.is_member(workspace_id));
