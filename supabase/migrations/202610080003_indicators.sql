-- All counts are authoritative backend aggregations. Pending includes review.
-- A due date is overdue after midnight America/Sao_Paulo on the following day.
-- Completed count is scoped to the selected period; distribution covers all tasks.
create function public.dashboard_summary(target_workspace uuid, period_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  first_day date;
  today date = (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not private.is_member(target_workspace) then raise insufficient_privilege using message = 'Workspace access denied'; end if;
  if period_days not between 1 and 90 then raise invalid_parameter_value using message = 'Period must be between 1 and 90 days'; end if;
  first_day = today - (period_days - 1);
  select jsonb_build_object(
    'active_projects', (select count(*) from public.projects where workspace_id = target_workspace and status = 'active'),
    'pending_tasks', (select count(*) from public.tasks where workspace_id = target_workspace and status <> 'done'),
    'overdue_tasks', (select count(*) from public.tasks where workspace_id = target_workspace and status <> 'done' and due_date < today),
    'completed_tasks', (select count(*) from public.tasks where workspace_id = target_workspace and status = 'done' and (completed_at at time zone 'America/Sao_Paulo')::date >= first_day),
    'total_tasks', (select count(*) from public.tasks where workspace_id = target_workspace),
    'weekly', (select jsonb_agg(jsonb_build_object(
      'date', day::date,
      'created', (select count(*) from public.tasks where workspace_id = target_workspace and (created_at at time zone 'America/Sao_Paulo')::date = day::date),
      'completed', (select count(*) from public.tasks where workspace_id = target_workspace and status = 'done' and (completed_at at time zone 'America/Sao_Paulo')::date = day::date)
    ) order by day) from generate_series(first_day::timestamp, today::timestamp, interval '1 day') day),
    'distribution', (select jsonb_agg(jsonb_build_object('status', stage, 'count',
      (select count(*) from public.tasks where workspace_id = target_workspace and status = stage)
    )) from unnest(enum_range(null::public.task_status)) stage)
  ) into result;
  return result;
end;
$$;
revoke all on function public.dashboard_summary(uuid, integer) from public;
grant execute on function public.dashboard_summary(uuid, integer) to authenticated;

create function public.team_directory(target_workspace uuid, search_term text default '')
returns table(id uuid, full_name text, avatar_url text, job_title text, role public.member_role, assigned_tasks bigint, completed_tasks bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_member(target_workspace) then raise insufficient_privilege using message = 'Workspace access denied'; end if;
  return query select p.id, p.full_name, p.avatar_url, p.job_title, m.role,
    (select count(*) from public.tasks t where t.workspace_id = target_workspace and t.assignee_id = p.id and t.status <> 'done'),
    (select count(*) from public.tasks t where t.workspace_id = target_workspace and t.assignee_id = p.id and t.status = 'done')
  from public.workspace_members m join public.profiles p on p.id = m.user_id
  where m.workspace_id = target_workspace and p.full_name ilike '%' || replace(replace(search_term, '%', '\%'), '_', '\_') || '%'
  order by p.full_name;
end;
$$;
revoke all on function public.team_directory(uuid, text) from public;
grant execute on function public.team_directory(uuid, text) to authenticated;
