-- Called only by trusted triggers; clients cannot choose recipients or forge actors.
create function private.deliver_task_notification(task public.tasks, kind public.notification_kind,
  actor uuid, recipients uuid[])
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(workspace_id, recipient_id, actor_id, actor_name,
    event_id, kind, project_id, task_id, task_title, task_status)
  select task.workspace_id, m.user_id, actor,
    coalesce((select p.full_name from public.profiles p where p.id = actor), 'Orbit'),
    gen_random_uuid(), kind, task.project_id, task.id, task.title,
    case when kind = 'status_changed' then task.status else null end
  from public.workspace_members m
  where m.workspace_id = task.workspace_id and m.removed_at is null
    and m.user_id = any(recipients) and m.user_id is distinct from actor;
$$;

create function private.notify_task_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    perform private.deliver_task_notification(new, 'assigned', coalesce(actor, new.created_by), array[new.assignee_id]);
  else
    if new.assignee_id is distinct from old.assignee_id then
      perform private.deliver_task_notification(new, 'assigned', actor, array[new.assignee_id]);
    end if;
    if new.status is distinct from old.status then
      perform private.deliver_task_notification(new, 'status_changed', actor, array[new.assignee_id, new.created_by]);
    end if;
  end if;
  return new;
end;
$$;

create function private.notify_task_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare task public.tasks;
begin
  select * into strict task from public.tasks where id = new.task_id and workspace_id = new.workspace_id;
  perform private.deliver_task_notification(task, 'commented', new.author_id, array[task.assignee_id, task.created_by]);
  return new;
end;
$$;

revoke all on function private.deliver_task_notification(public.tasks, public.notification_kind, uuid, uuid[]),
  private.notify_task_changes(), private.notify_task_comment() from public, anon, authenticated;
create trigger task_notifications after insert or update on public.tasks
  for each row execute function private.notify_task_changes();
create trigger comment_notifications after insert on public.task_comments
  for each row execute function private.notify_task_comment();
