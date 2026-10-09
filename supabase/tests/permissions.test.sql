begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(11);

insert into auth.users(id, email, raw_user_meta_data)
values('f0b17000-0000-4000-8000-000000000001', 'outside-orbit-test@example.test', '{"full_name":"Outside user"}');
insert into public.workspaces(id, name) values('f0b17000-0000-4000-8000-000000000002', 'Outside workspace');
insert into public.workspace_members(workspace_id, user_id, role)
values('f0b17000-0000-4000-8000-000000000002', 'f0b17000-0000-4000-8000-000000000001', 'admin');

select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'marina@orbit.local'), true);
set local role authenticated;
select is((select count(*) from public.workspaces), 1::bigint, 'Admin only sees own workspace');
select is((select count(*) from public.projects), 6::bigint, 'Admin sees seeded projects');
select is((select count(*) from public.profiles), 4::bigint, 'Directory only exposes colleagues');
select throws_ok($$select public.dashboard_summary('f0b17000-0000-4000-8000-000000000002', 7)$$,
  '42501', null, 'Dashboard rejects another workspace');
select throws_ok($$insert into public.tasks(workspace_id, project_id, title, created_by, assignee_id)
  values('a0b17000-0000-4000-8000-000000000001', 'b0b17000-0000-4000-8000-000000000001', 'Invalid assignee', auth.uid(), 'f0b17000-0000-4000-8000-000000000001')$$,
  '23503', null, 'Task cannot assign user from another workspace');
select throws_ok($$update public.workspace_members set role = 'admin'$$,
  '42501', null, 'Membership roles cannot be changed from the API');
select is((select (public.dashboard_summary('a0b17000-0000-4000-8000-000000000001', 7)->>'total_tasks')::bigint),
  (select count(*) from public.tasks), 'Dashboard total agrees with persisted records');
reset role;

select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'rafael@orbit.local'), true);
set local role authenticated;
select throws_ok($$insert into public.projects(workspace_id, title, created_by)
  values('a0b17000-0000-4000-8000-000000000001', 'Forbidden project', auth.uid())$$,
  '42501', null, 'Member cannot create projects');
select lives_ok($$update public.tasks set status = 'done' where id = md5('orbit-seed-task-1-4')::uuid$$,
  'Member can update task status');
select ok((select completed_at is not null from public.tasks where id = md5('orbit-seed-task-1-4')::uuid),
  'Completing task stores completion timestamp');
reset role;

set local role anon;
select throws_ok($$select * from public.projects$$, '42501', null, 'Anonymous users cannot read projects');
reset role;
select * from finish();
rollback;
