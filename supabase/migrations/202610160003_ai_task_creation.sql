-- SECURITY INVOKER is intentional: task writes retain the caller's RLS policies.
-- The ledger helpers hold the same row lock through this entire transaction.
create function public.complete_ai_task_request(request_id uuid, lease uuid, draft jsonb, clarification text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare job private.ai_task_requests; created_task uuid;
begin
  job := private.lock_ai_task_request(request_id, lease);
  if job.result is not null then return job.result; end if;
  if draft is not null then
    if clarification is not null or jsonb_typeof(draft) <> 'object'
      or (select count(*) from jsonb_object_keys(draft)) <> 5
      or not (draft ?& array['title','description','priority','assignee_id','due_date'])
      or jsonb_typeof(draft->'title') <> 'string'
      or char_length(trim(draft->>'title')) not between 3 and 160
      or jsonb_typeof(draft->'priority') <> 'string'
      or (draft->>'priority') not in ('low','medium','high')
      or jsonb_typeof(draft->'description') not in ('string','null')
      or char_length(draft->>'description') > 5000
      or jsonb_typeof(draft->'assignee_id') not in ('string','null')
      or jsonb_typeof(draft->'due_date') not in ('string','null')
      or (draft->>'due_date') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'AI_INVALID_TASK' using errcode = '22023';
    end if;
    insert into public.tasks(workspace_id,project_id,created_by,title,description,priority,assignee_id,due_date,status)
      values (job.workspace_id,job.project_id,auth.uid(),trim(draft->>'title'),draft->>'description',
        (draft->>'priority')::public.task_priority,(draft->>'assignee_id')::uuid,(draft->>'due_date')::date,'todo')
      returning id into created_task;
  elsif clarification is null or char_length(trim(clarification)) not between 1 and 600 then
    raise exception 'AI_INVALID_CLARIFICATION' using errcode = '22023';
  end if;
  return private.finish_ai_task_request(request_id, lease, created_task, clarification);
end;
$$;
revoke all on function public.complete_ai_task_request(uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.complete_ai_task_request(uuid,uuid,jsonb,text) to authenticated;
