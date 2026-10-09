-- A company uses the existing workspace boundary and its RLS policies.
alter table public.profiles add column active_workspace_id uuid
  references public.workspaces(id) on delete set null;

create function private.confirmed_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
$$;
revoke all on function private.confirmed_email() from public;
grant execute on function private.confirmed_email() to authenticated;

create function public.create_company(company_name text) returns public.workspaces
language plpgsql security definer set search_path = '' as $$
declare company public.workspaces;
begin
  if auth.uid() is null or private.confirmed_email() is null then
    raise exception 'Confirm your email first' using errcode = '42501';
  end if;
  if company_name is null or char_length(trim(company_name)) not between 2 and 100 then
    raise exception 'Invalid company name' using errcode = '22023';
  end if;
  insert into public.workspaces(name) values(trim(company_name)) returning * into company;
  insert into public.workspace_members(workspace_id, user_id, role)
  values(company.id, auth.uid(), 'admin');
  update public.profiles set active_workspace_id = company.id where id = auth.uid();
  return company;
end;
$$;

create function public.select_company(target_workspace uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(target_workspace) then
    raise exception 'Membership required' using errcode = '42501';
  end if;
  update public.profiles set active_workspace_id = target_workspace where id = auth.uid();
  if not found then raise exception 'Profile missing' using errcode = 'P0002'; end if;
  return target_workspace;
end;
$$;

revoke all on function public.create_company(text), public.select_company(uuid) from public, anon;
grant execute on function public.create_company(text), public.select_company(uuid) to authenticated;
