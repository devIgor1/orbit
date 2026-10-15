begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data) values
 ('f7000000-0000-4000-8000-000000000001','trash-admin@example.test','{"full_name":"Admin"}'),
 ('f7000000-0000-4000-8000-000000000002','trash-member@example.test','{"full_name":"Membro"}'),
 ('f7000000-0000-4000-8000-000000000003','trash-outsider@example.test','{"full_name":"Outsider"}');
insert into workspaces(id,name) values ('f7000000-0000-4000-8000-000000000010','Empresa lixeira'),
 ('f7000000-0000-4000-8000-000000000011','Outra empresa');
insert into workspace_members(workspace_id,user_id,role) values
 ('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000001','admin'),
 ('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000002','member'),
 ('f7000000-0000-4000-8000-000000000011','f7000000-0000-4000-8000-000000000003','admin');
update profiles set active_workspace_id='f7000000-0000-4000-8000-000000000010'
 where id in ('f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002');
insert into projects(id,workspace_id,title,created_by) values
 ('f7000000-0000-4000-8000-000000000020','f7000000-0000-4000-8000-000000000010','Projeto P','f7000000-0000-4000-8000-000000000001'),
 ('f7000000-0000-4000-8000-000000000021','f7000000-0000-4000-8000-000000000010','Projeto Q','f7000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
insert into tasks(id,workspace_id,project_id,title,created_by,assignee_id) values
 ('f7000000-0000-4000-8000-000000000030','f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020','Tarefa 1','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002'),
 ('f7000000-0000-4000-8000-000000000031','f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020','Tarefa 2','f7000000-0000-4000-8000-000000000001',null);
insert into task_comments(workspace_id,task_id,author_id,body) values
 ('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030','f7000000-0000-4000-8000-000000000001','Comentário');
insert into workspace_invitations(workspace_id,email,created_by) values
 ('f7000000-0000-4000-8000-000000000010','convidado@example.test','f7000000-0000-4000-8000-000000000001');

-- Only administrators move items to the trash.
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok($$select delete_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'42501',null,'Member cannot delete a task');
select throws_ok($$select delete_project('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020')$$,'42501',null,'Member cannot delete a project');
select throws_ok($$select trash_items('f7000000-0000-4000-8000-000000000010')$$,'42501',null,'Member cannot open the trash');
select is((select count(*) from notifications where task_id='f7000000-0000-4000-8000-000000000030'),2::bigint,'Member sees assignment and comment notifications');
reset role;

select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select throws_ok($$select delete_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'42501',null,'Outsider cannot delete a task');
reset role;

select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(delete_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030'),
 'f7000000-0000-4000-8000-000000000030'::uuid,'Admin moves a task to the trash');
select is((select count(*) from tasks where project_id='f7000000-0000-4000-8000-000000000020'),1::bigint,'Task in the trash is hidden');
select is((select count(*) from task_comments),0::bigint,'Comments of a task in the trash are hidden');
select is((select count(*) from activity_events where task_id='f7000000-0000-4000-8000-000000000030'),0::bigint,'History of a task in the trash is hidden');
select throws_ok($$insert into task_comments(workspace_id,task_id,author_id,body) values ('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030','f7000000-0000-4000-8000-000000000001','Novo')$$,
 '42501',null,'Cannot comment on a task in the trash');
select throws_ok($$select delete_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'42501',null,'Task cannot be deleted twice');
select is(jsonb_array_length(trash_items('f7000000-0000-4000-8000-000000000010')->'tasks'),1,'Trash lists the task');
select is((trash_items('f7000000-0000-4000-8000-000000000010')->'tasks'->0->>'deleted_by'),'Admin','Trash shows who deleted');
reset role;

select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from notifications),0::bigint,'Notifications of a task in the trash are hidden');
update tasks set title='Alterada' where id='f7000000-0000-4000-8000-000000000030';
reset role;
select is((select title from tasks where id='f7000000-0000-4000-8000-000000000030'),'Tarefa 1','Task in the trash cannot be edited');

select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(delete_project('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020'),
 'f7000000-0000-4000-8000-000000000020'::uuid,'Admin moves a project to the trash');
select is((select count(*) from projects),1::bigint,'Project in the trash is hidden');
select is((select count(*) from tasks),0::bigint,'Tasks of a project in the trash are hidden');
select throws_ok($$insert into tasks(workspace_id,project_id,title,created_by) values ('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020','Nova','f7000000-0000-4000-8000-000000000001')$$,
 '42501',null,'Cannot add tasks to a project in the trash');
select is((trash_items('f7000000-0000-4000-8000-000000000010')->'projects'->0->>'task_count')::int,2,'Trash shows how many tasks travel with the project');
select is(jsonb_array_length(trash_items('f7000000-0000-4000-8000-000000000010')->'tasks'),0,'Tasks of a project in the trash are listed with the project');
select throws_ok($$select restore_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'55000',null,'Task waits for its project to be restored');
select is((select (dashboard_summary('f7000000-0000-4000-8000-000000000010')->>'total_tasks')::int),0,'Dashboard ignores the trash');
select lives_ok($$select restore_project('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000020')$$,'Admin restores the project');
select is((select count(*) from tasks),1::bigint,'Project tasks come back, except the task deleted on its own');
select lives_ok($$select restore_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'Admin restores the task');
select is((select count(*) from tasks),2::bigint,'Restored task is visible again');
select is((select count(*) from task_comments),1::bigint,'Comments come back with the task');
select ok((select bool_or(action='deleted') and bool_or(action='restored') from activity_events where task_id='f7000000-0000-4000-8000-000000000030'),'History records deletion and restoration');
select throws_ok($$select restore_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'P0002',null,'Only items in the trash can be restored');
-- Permanent deletion on request.
select lives_ok($$select delete_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000031')$$,'Admin deletes another task');
select throws_ok($$select purge_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000030')$$,'P0002',null,'Active task cannot be purged');
select lives_ok($$select purge_task('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000031')$$,'Admin deletes a task permanently');
reset role;
select is((select count(*) from tasks where id='f7000000-0000-4000-8000-000000000031'),0::bigint,'Purged task no longer exists');

-- Expiration after 15 days.
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select delete_project('f7000000-0000-4000-8000-000000000010','f7000000-0000-4000-8000-000000000021')$$,'Admin deletes project Q');
reset role;
update projects set deleted_at=now()-interval '16 days' where id='f7000000-0000-4000-8000-000000000021';
set local role authenticated;
select is(jsonb_array_length(trash_items('f7000000-0000-4000-8000-000000000010')->'projects'),0,'Expired items leave the trash');
reset role;
select is((select count(*) from projects where id='f7000000-0000-4000-8000-000000000021'),0::bigint,'Expired project is deleted permanently');
select is((select count(*) from tasks where id='f7000000-0000-4000-8000-000000000030'),1::bigint,'Other projects are untouched');

-- Company: rename, delete, restore.
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok($$select rename_company('f7000000-0000-4000-8000-000000000010','Novo nome')$$,'42501',null,'Member cannot rename the company');
select throws_ok($$select delete_company('f7000000-0000-4000-8000-000000000010','Empresa lixeira')$$,'42501',null,'Member cannot delete the company');
reset role;
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok($$select rename_company('f7000000-0000-4000-8000-000000000010','X')$$,'22023',null,'Company name is validated');
select is((rename_company('f7000000-0000-4000-8000-000000000010','  Empresa renomeada ')).name,'Empresa renomeada','Admin renames the company');
select throws_ok($$select delete_company('f7000000-0000-4000-8000-000000000010','Empresa lixeira')$$,'22023',null,'Deletion requires the current name');
select is(delete_company('f7000000-0000-4000-8000-000000000010','Empresa renomeada'),'f7000000-0000-4000-8000-000000000010'::uuid,'Admin deletes the company');
select is((select count(*) from workspaces),0::bigint,'Deleted company is hidden from its admin');
select is((select count(*) from projects),0::bigint,'Projects of a deleted company are hidden');
select is((select count(*) from deleted_companies()),1::bigint,'Admin finds the company in the trash');
reset role;
select is((select status from workspace_invitations where email='convidado@example.test'),'revoked','Pending invitations are revoked');
select is((select count(*) from profiles where active_workspace_id='f7000000-0000-4000-8000-000000000010'),0::bigint,'Nobody keeps the deleted company active');
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from workspaces),0::bigint,'Members lose access to the deleted company');
select is((select count(*) from deleted_companies()),0::bigint,'Members do not see the deleted company');
select throws_ok($$select restore_company('f7000000-0000-4000-8000-000000000010')$$,'42501',null,'Member cannot restore the company');
select throws_ok($$select select_company('f7000000-0000-4000-8000-000000000010')$$,'42501',null,'Deleted company cannot be selected');
reset role;
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select restore_company('f7000000-0000-4000-8000-000000000010')$$,'Admin restores the company');
select is((select count(*) from projects),1::bigint,'Projects return with the company');
select is((select active_workspace_id from profiles where id=auth.uid()),'f7000000-0000-4000-8000-000000000010'::uuid,'Restored company becomes active');
select lives_ok($$select delete_company('f7000000-0000-4000-8000-000000000010','Empresa renomeada')$$,'Admin deletes the company again');
reset role;
update workspaces set deleted_at=now()-interval '16 days' where id='f7000000-0000-4000-8000-000000000010';
select set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from deleted_companies()),0::bigint,'Expired company leaves the trash');
reset role;
select is((select count(*) from workspaces where id='f7000000-0000-4000-8000-000000000010'),0::bigint,'Expired company is deleted permanently');
select is((select count(*) from tasks where workspace_id='f7000000-0000-4000-8000-000000000010'),0::bigint,'Its tasks are deleted too');
select is((select count(*) from workspaces where id='f7000000-0000-4000-8000-000000000011'),1::bigint,'Other companies are untouched');

select * from finish();
rollback;
