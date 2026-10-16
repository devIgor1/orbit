-- Only a fixed rejection code is stored. No model-written answer or task is persisted.
create function public.reject_ai_task_request(request_id uuid, lease uuid, reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare job private.ai_task_requests; outcome jsonb;
begin
  job := private.lock_ai_task_request(request_id, lease);
  if job.result is not null then return job.result; end if;
  if reason is null or reason not in ('out_of_scope', 'unsupported_action', 'instruction_override') then
    raise exception 'AI_INVALID_REJECTION' using errcode = '22023';
  end if;
  outcome := jsonb_build_object('kind', 'rejected', 'reason', reason);
  update private.ai_task_requests set result = outcome where id = job.id;
  return outcome;
end;
$$;
revoke all on function public.reject_ai_task_request(uuid,uuid,text) from public, anon;
grant execute on function public.reject_ai_task_request(uuid,uuid,text) to authenticated;
