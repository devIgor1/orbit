create function public.claim_github_jobs() returns jsonb language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links; job private.github_sync_jobs; result jsonb = '[]'; repo public.github_repositories;
begin
  for link in select l.* from public.task_github_links l join private.github_sync_jobs j on j.link_id = l.id
    join public.github_repositories r on r.id = l.repository_id
    where r.active and j.due_at <= now() and (j.lease_until is null or j.lease_until < now())
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
create function private.github_locked_link(target_link uuid, job_lease uuid) returns public.task_github_links
language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links;
begin
  select * into link from public.task_github_links where id = target_link for update;
  if not found then raise exception 'Link missing' using errcode = '22023'; end if;
  perform 1 from private.github_sync_jobs where link_id = target_link and lease = job_lease and lease_until > now() for update;
  if not found then raise exception 'Lease expired' using errcode = '55P03'; end if;
  return link;
end;
$$;
create function public.apply_github_snapshot(target_link uuid, job_lease uuid, snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links; next_status public.task_status; receipt bigint; task public.tasks;
begin
  link = private.github_locked_link(target_link,job_lease);
  if not exists(select 1 from public.github_repositories where id = link.repository_id and active) then raise insufficient_privilege; end if;
  if link.pr_number is not null and link.pr_number is distinct from (snapshot->>'pr_number')::integer then
    raise exception 'PR mismatch' using errcode = '22023';
  end if;
  if link.pr_state = 'merged' and snapshot->>'pr_state' <> 'merged' then
    raise exception 'Merge cannot be reversed' using errcode = '22023';
  end if;
  if snapshot->>'pr_state' = 'merged' then
    select comment_id into receipt from private.github_comment_receipts where workspace_id = link.workspace_id
      and task_id = link.task_id and repository_id = link.repository_id and pr_number = (snapshot->>'pr_number')::integer;
  end if;
  update public.task_github_links set branch = snapshot->>'branch', head_repository_id = (snapshot->>'head_repository_id')::bigint,
    pr_number = (snapshot->>'pr_number')::integer, pr_title = snapshot->>'pr_title',pr_state = snapshot->>'pr_state',
    merged_at = (snapshot->>'merged_at')::timestamptz, last_synced_at = now(),sync_status = 'synced',last_error_code = null,
    comment_status = case when snapshot->>'pr_state' <> 'merged' then 'not_due' when receipt is not null then 'sent' else 'pending' end,
    comment_id = receipt where id = link.id;
  if link.last_synced_at is null or link.pr_state <> snapshot->>'pr_state' then
    next_status = case snapshot->>'pr_state' when 'merged' then 'done'::public.task_status
      when 'open' then 'review'::public.task_status else 'in_progress'::public.task_status end;
    perform set_config('orbit.github_sync','on',true);
    update public.tasks set status = next_status where id = link.task_id and status <> next_status;
    perform set_config('orbit.github_sync','off',true);
  end if;
  select * into task from public.tasks where id = link.task_id;
  return jsonb_build_object('task_title',task.title,'comment_id',receipt);
end;
$$;
create function public.finish_github_job(target_link uuid, job_lease uuid, job_generation integer, failure_code text default null, sent_comment_id bigint default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare link public.task_github_links;
begin
  link = private.github_locked_link(target_link,job_lease);
  if failure_code is not null then
    update public.task_github_links set sync_status = 'error',last_error_code = failure_code,
      comment_status = case when comment_status = 'pending' then 'error' else comment_status end where id = link.id;
  elsif sent_comment_id is not null then
    if link.pr_state <> 'merged' then raise exception 'Merge required' using errcode = '22023'; end if;
    insert into private.github_comment_receipts values(link.workspace_id,link.task_id,link.repository_id,link.pr_number,sent_comment_id)
      on conflict(workspace_id,task_id,repository_id,pr_number) do update set comment_id = excluded.comment_id;
    update public.task_github_links set comment_status = 'sent',comment_id = sent_comment_id where id = link.id;
  end if;
  update private.github_sync_jobs set lease = null,lease_until = null,
    attempts = case when failure_code is null then 0 else least(attempts + 1,10) end,
    due_at = case when generation <> job_generation then now()
      when failure_code is null and (sent_comment_id is not null or link.comment_status = 'sent') then 'infinity'::timestamptz
      when failure_code is null then now() + interval '10 minutes'
      else now() + least(3600,60 * power(2,least(attempts,6))) * interval '1 second' end
    where link_id = link.id;
  return link.id;
end;
$$;
revoke all on function private.github_locked_link(uuid,uuid) from public,anon,authenticated;
revoke all on function public.claim_github_jobs(),public.apply_github_snapshot(uuid,uuid,jsonb),
  public.finish_github_job(uuid,uuid,integer,text,bigint) from public,anon,authenticated;
grant execute on function public.claim_github_jobs(),public.apply_github_snapshot(uuid,uuid,jsonb),
  public.finish_github_job(uuid,uuid,integer,text,bigint) to service_role;

-- Preserve the existing audit behavior and explicitly identify the automation.
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
  end if;
  if kind = 'task' and current_setting('orbit.github_sync',true) = 'on' then
    actor = null; event_action = 'github_status_changed';
  end if;
  insert into public.activity_events(workspace_id,entity_type,entity_id,project_id,task_id,action,title,actor_id)
    values(new.workspace_id,kind,new.id,project,task,event_action,label,actor);
  return new;
end;
$$;
