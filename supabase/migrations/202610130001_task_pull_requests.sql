-- A task chooses its own repository; historical project associations are retained
-- only for compatibility with older clients and never constrain task links.
alter table public.task_github_links
  drop constraint task_github_links_workspace_id_project_id_repository_id_fkey,
  drop constraint task_github_links_workspace_id_task_id_fkey;
alter table public.tasks add constraint tasks_workspace_project_id_key unique(workspace_id,project_id,id);
alter table public.task_github_links
  add constraint task_github_links_repository_fkey foreign key(workspace_id,repository_id)
    references public.github_repositories(workspace_id,id),
  add constraint task_github_links_task_fkey foreign key(workspace_id,project_id,task_id)
    references public.tasks(workspace_id,project_id,id) on delete cascade;

comment on table public.project_github_repositories is
  'Legacy project associations. New clients link each task directly to a PR; these rows do not restrict task repositories.';

create or replace function public.link_task_github(requester uuid, target_workspace uuid,
  target_task uuid, target_repository uuid, development jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare task public.tasks; result uuid; repo public.github_repositories;
begin
  perform private.require_active_member(target_workspace,requester);
  select * into task from public.tasks where id=target_task and workspace_id=target_workspace for update;
  if not found then raise insufficient_privilege; end if;
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
revoke all on function public.link_task_github(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.link_task_github(uuid,uuid,uuid,uuid,jsonb) to service_role;
