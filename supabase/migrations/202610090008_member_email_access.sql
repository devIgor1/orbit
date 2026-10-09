create or replace function public.prepare_invitation_email(
  invitation_id uuid, requester_id uuid, application_url text, from_email text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  invitation public.workspace_invitations;
  job private.invitation_email_jobs;
  requester_email text;
  requester_name text;
  company text;
begin
  select * into invitation from public.workspace_invitations i where i.id = invitation_id for update;
  if not found or not exists (
    select 1 from public.workspace_members m join auth.users u on u.id = m.user_id
    where m.workspace_id = invitation.workspace_id and m.user_id = requester_id
      and m.role = 'admin' and m.removed_at is null and u.email_confirmed_at is not null
  ) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'Invitation unavailable' using errcode = 'PT410';
  end if;
  if invitation.email_requested_at > now() - interval '1 minute' then
    raise exception 'Wait before sending again' using errcode = 'PT429';
  end if;
  if application_url !~ '^https?://[^[:space:]?#]+$'
    or from_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then
    raise exception 'Invalid server mail configuration' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(invitation.workspace_id::text, 0));
  -- Retry an uncertain/failed request using the exact same provider key and body.
  select * into job from private.invitation_email_jobs j
    where j.id = invitation.email_job_id and j.status <> 'sent'
      and j.created_at > now() - interval '23 hours' and j.expires_at > now()
      and j.requested_by = requester_id;
  if not found then
    if (select count(*) from private.invitation_email_jobs j
      where j.workspace_id = invitation.workspace_id and j.created_at > now() - interval '1 hour') >= 30 then
      raise exception 'Company email limit reached' using errcode = 'PT429';
    end if;
    select u.email, p.full_name into requester_email, requester_name
      from auth.users u join public.profiles p on p.id = u.id where u.id = requester_id;
    select w.name into company from public.workspaces w where w.id = invitation.workspace_id;
    insert into private.invitation_email_jobs(
      invitation_id, workspace_id, requested_by, recipient, inviter_name, reply_to,
      company_name, sender_email, invitation_url, expires_at
    ) values (
      invitation.id, invitation.workspace_id, requester_id, invitation.email,
      requester_name, requester_email, company, from_email,
      rtrim(application_url, '/') || '/companies?invitation=' || invitation.id, invitation.expires_at
    ) returning * into job;
  else
    update private.invitation_email_jobs set status = 'sending', attempted_at = now()
      where id = job.id returning * into job;
  end if;
  update public.workspace_invitations set email_status = 'sending',
    email_requested_at = now(), email_job_id = job.id where id = invitation.id;
  return to_jsonb(job);
end;
$$;
