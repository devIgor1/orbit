-- GitHub credentials never live in public tables. One development link per task.
create table public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  github_id bigint not null check (github_id > 0),
  installation_id bigint not null check (installation_id > 0),
  full_name text not null check (full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  default_branch text not null,
  is_private boolean not null,
  active boolean not null default true,
  connected_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(workspace_id, github_id), unique(workspace_id, id)
);
create table public.project_github_repositories (
  project_id uuid primary key,
  workspace_id uuid not null,
  repository_id uuid not null,
  unique(workspace_id, project_id, repository_id),
  foreign key(workspace_id, project_id) references public.projects(workspace_id,id) on delete cascade,
  foreign key(workspace_id, repository_id) references public.github_repositories(workspace_id,id)
);
create table public.task_github_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique,
  workspace_id uuid not null,
  project_id uuid not null,
  repository_id uuid not null,
  branch text not null check (length(branch) between 1 and 255),
  head_repository_id bigint not null,
  pr_number integer check (pr_number > 0),
  pr_title text,
  pr_state text not null default 'branch' check (pr_state in ('branch','draft','open','closed','merged')),
  merged_at timestamptz,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced','error','unavailable')),
  last_error_code text,
  last_synced_at timestamptz,
  comment_status text not null default 'not_due' check (comment_status in ('not_due','pending','sent','error')),
  comment_id bigint,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key(workspace_id, task_id) references public.tasks(workspace_id,id) on delete cascade,
  foreign key(workspace_id, project_id, repository_id)
    references public.project_github_repositories(workspace_id,project_id,repository_id),
  check ((pr_state = 'branch') = (pr_number is null)),
  check ((pr_state = 'merged') = (merged_at is not null))
);
create index github_links_repository on public.task_github_links(repository_id,pr_number,branch);
create table private.github_oauth_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  repository_name text not null,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create table private.github_sync_jobs (
  link_id uuid primary key references public.task_github_links(id) on delete cascade,
  generation integer not null default 1,
  due_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  attempts integer not null default 0
);
create table private.github_deliveries (
  id uuid primary key,
  received_at timestamptz not null default now()
);
-- Receipts survive unlink/relink and make ambiguous HTTP outcomes recoverable.
create table private.github_comment_receipts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  pr_number integer not null,
  comment_id bigint not null,
  primary key(workspace_id,task_id,repository_id,pr_number)
);
alter table public.github_repositories enable row level security;
alter table public.project_github_repositories enable row level security;
alter table public.task_github_links enable row level security;
revoke all on public.github_repositories, public.project_github_repositories, public.task_github_links from anon, authenticated;
grant select on public.github_repositories, public.project_github_repositories, public.task_github_links to authenticated;
create policy github_repositories_read on public.github_repositories for select to authenticated using(private.is_member(workspace_id));
create policy project_github_read on public.project_github_repositories for select to authenticated using(private.is_member(workspace_id));
create policy task_github_read on public.task_github_links for select to authenticated using(private.is_member(workspace_id));
revoke all on private.github_oauth_states, private.github_sync_jobs, private.github_deliveries, private.github_comment_receipts from public, anon, authenticated;
