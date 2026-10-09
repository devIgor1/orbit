create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.project_status as enum ('active', 'paused', 'completed', 'archived');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.member_role as enum ('admin', 'member');
create type public.activity_entity as enum ('project', 'task', 'comment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  job_title text check (char_length(job_title) <= 100),
  created_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (char_length(description) <= 3000),
  status public.project_status not null default 'active',
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text check (char_length(description) <= 5000),
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid,
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, assignee_id) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id)
);
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  task_id uuid not null,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, task_id) references public.tasks(workspace_id, id) on delete cascade,
  foreign key (workspace_id, author_id) references public.workspace_members(workspace_id, user_id)
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type public.activity_entity not null,
  entity_id uuid not null,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  action text not null,
  title text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index memberships_user on public.workspace_members(user_id, created_at);
create index projects_workspace on public.projects(workspace_id, status, created_at desc);
create index tasks_project on public.tasks(workspace_id, project_id, created_at, id);
create index tasks_assignee on public.tasks(workspace_id, assignee_id, status);
create index tasks_due on public.tasks(workspace_id, due_date) where status <> 'done';
create index comments_task on public.task_comments(workspace_id, task_id, created_at);
create index activity_workspace on public.activity_events(workspace_id, created_at desc);
create index activity_task on public.activity_events(workspace_id, task_id, created_at desc);

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name) values (
    new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Novo membro'), 100)
  );
  return new;
end;
$$;
revoke all on function private.create_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();

create function private.touch_record() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if tg_table_name = 'tasks' then
    if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
      new.completed_at = coalesce(new.completed_at, now());
    elsif new.status <> 'done' then
      new.completed_at = null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.touch_record() from public;
create trigger project_updated before update on public.projects for each row execute function private.touch_record();
create trigger task_updated before insert or update on public.tasks for each row execute function private.touch_record();

create function private.record_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  kind public.activity_entity;
  project uuid;
  task uuid;
  label text;
  actor uuid;
  event_action text;
begin
  if tg_table_name = 'projects' then
    kind = 'project'; project = new.id; label = new.title; actor = coalesce(auth.uid(), new.created_by);
  elsif tg_table_name = 'tasks' then
    kind = 'task'; project = new.project_id; task = new.id; label = new.title; actor = coalesce(auth.uid(), new.created_by);
  else
    kind = 'comment'; task = new.task_id; actor = coalesce(auth.uid(), new.author_id);
    select t.project_id, t.title into project, label from public.tasks t where t.id = task;
  end if;
  event_action = case when kind = 'comment' then 'commented' when tg_op = 'INSERT' then 'created' else 'updated' end;
  if tg_op = 'UPDATE' and tg_table_name in ('projects', 'tasks') then
    if new.status <> old.status then event_action = 'status_changed'; end if;
  end if;
  insert into public.activity_events(workspace_id, entity_type, entity_id, project_id, task_id, action, title, actor_id)
  values (new.workspace_id, kind, new.id, project, task, event_action, label, actor);
  return new;
end;
$$;
revoke all on function private.record_activity() from public;
create trigger project_activity after insert or update on public.projects for each row execute function private.record_activity();
create trigger task_activity after insert or update on public.tasks for each row execute function private.record_activity();
create trigger comment_activity after insert on public.task_comments for each row execute function private.record_activity();
