begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('e0900000-0000-4000-8000-000000000001','admin@members.test',now(),'{"full_name":"Admin"}'),
('e0900000-0000-4000-8000-000000000002','person@members.test',now(),'{"full_name":"Person"}'),
('e0900000-0000-4000-8000-000000000003','outside@members.test',now(),'{"full_name":"Outside"}');
insert into public.workspaces(id,name) values
('e0900000-0000-4000-8000-000000000010','Company A'),('e0900000-0000-4000-8000-000000000020','Company B');
insert into public.workspace_members(workspace_id,user_id,role) values
('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000001','admin'),
('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','member'),
('e0900000-0000-4000-8000-000000000020','e0900000-0000-4000-8000-000000000003','admin'),
('e0900000-0000-4000-8000-000000000020','e0900000-0000-4000-8000-000000000002','member');
insert into public.projects(id,workspace_id,title,created_by) values
('e0900000-0000-4000-8000-000000000030','e0900000-0000-4000-8000-000000000010','Project','e0900000-0000-4000-8000-000000000002');
insert into public.tasks(id,workspace_id,project_id,title,created_by,assignee_id,status)
select ('e0900000-0000-4000-8000-00000000004'||n)::uuid,'e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000030',
  'Task '||n,'e0900000-0000-4000-8000-000000000002','e0900000-0000-4000-8000-000000000002',
  case when n=3 then 'done'::public.task_status else 'todo'::public.task_status end from generate_series(1,3) n;
insert into public.task_comments(workspace_id,task_id,author_id,body) values
('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000041','e0900000-0000-4000-8000-000000000002','Preserved comment');
update public.profiles set active_workspace_id='e0900000-0000-4000-8000-000000000010' where id='e0900000-0000-4000-8000-000000000002';
insert into public.workspace_invitations(id,workspace_id,email,status,accepted_by,accepted_at) values
('e0900000-0000-4000-8000-000000000050','e0900000-0000-4000-8000-000000000010','person@members.test','accepted','e0900000-0000-4000-8000-000000000002',now());

set local role anon;
select throws_ok($$select public.member_management_details('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002')$$,'42501',null,'Anonymous management blocked');
reset role;
select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok($$select public.change_member_role('e0900000-0000-4000-8000-000000000010',auth.uid(),'member','admin')$$,'42501',null,'No self promotion');
select throws_ok($$select public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000001','admin',0)$$,'42501',null,'Member cannot remove admin');
select throws_ok($$update public.workspace_members set removed_at=now() where user_id=auth.uid()$$,'42501',null,'Direct membership writes blocked');
select is((select count(*) from public.workspace_member_events),0::bigint,'Member cannot read management audit');
reset role;
select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000003',true);
set local role authenticated;
select throws_ok($$select public.change_member_role('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','member','admin')$$,'42501',null,'Admin from another company blocked');
reset role;
select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select pending_tasks from public.member_management_details('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002')),2::bigint,'Preview counts only pending tasks');
select ok((select is_last_admin from public.member_management_details('e0900000-0000-4000-8000-000000000010',auth.uid())),'Preview protects last admin');
select throws_ok($$select public.change_member_role('e0900000-0000-4000-8000-000000000010',auth.uid(),'admin','member')$$,'PT412',null,'Cannot demote last admin');
select throws_ok($$select public.remove_workspace_member('e0900000-0000-4000-8000-000000000010',auth.uid(),'admin',0)$$,'PT412',null,'Cannot remove last admin');
select is((public.change_member_role('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','member','admin')).new_role::text,'admin','Promotion persisted and audited');
select throws_ok($$select public.change_member_role('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','member','admin')$$,'PT409',null,'Stale role cannot overwrite newer change');
select throws_ok($$select public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','admin',1)$$,'PT409',null,'Stale task count requires renewed confirmation');
select throws_ok($$select public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','admin',2,'e0900000-0000-4000-8000-000000000003')$$,'42501',null,'Cannot transfer tasks outside company');
select is((public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','admin',2,auth.uid())).affected_tasks,2,'Pending tasks transferred atomically');
select is((select count(*) from public.tasks where assignee_id=auth.uid()),2::bigint,'New responsible owns pending tasks');
select is((select assignee_id from public.tasks where id='e0900000-0000-4000-8000-000000000043'),'e0900000-0000-4000-8000-000000000002'::uuid,'Completed attribution preserved');
select is((select count(*) from public.task_comments where body='Preserved comment'),1::bigint,'Comments preserved');
select is((select created_by from public.projects where id='e0900000-0000-4000-8000-000000000030'),'e0900000-0000-4000-8000-000000000002'::uuid,'Project authorship preserved');
select is((select count(*) from public.team_directory('e0900000-0000-4000-8000-000000000010')),1::bigint,'Removed member excluded from active directory');
select is((select count(*) from public.team_directory('e0900000-0000-4000-8000-000000000010','',true)),2::bigint,'Historical directory keeps former authors');
select is((select full_name from public.profiles where id='e0900000-0000-4000-8000-000000000002'),'Person','Active readers can resolve former author names');
select throws_ok($$update public.tasks set assignee_id='e0900000-0000-4000-8000-000000000002' where id='e0900000-0000-4000-8000-000000000041'$$,'23503',null,'Former member cannot receive new assignments');
select is((select count(*) from public.workspace_member_events),2::bigint,'Only successful changes are audited');
select throws_ok($$delete from public.workspace_member_events$$,'42501',null,'Audit cannot be deleted by frontend');
select throws_ok($$select public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','admin',0)$$,'PT404',null,'Repeated removal is not artificial success');
reset role;

select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from public.projects where workspace_id='e0900000-0000-4000-8000-000000000010'),0::bigint,'Existing session loses project reads');
select is((select count(*) from public.workspaces),1::bigint,'Other company access preserved');
select ok((select active_workspace_id is null from public.profiles where id=auth.uid()),'Removed company preference cleared');
select throws_ok($$select public.team_directory('e0900000-0000-4000-8000-000000000010')$$,'42501',null,'Existing session loses directory');
select throws_ok($$select public.accept_invitation('e0900000-0000-4000-8000-000000000050')$$,'PT410',null,'Old accepted link cannot restore access');
select throws_ok($$select public.invite_collaborator('e0900000-0000-4000-8000-000000000010','other@members.test')$$,'42501',null,'Removed admin cannot invite');
reset role;
select throws_ok($$select public.prepare_invitation_email('e0900000-0000-4000-8000-000000000050','e0900000-0000-4000-8000-000000000002','https://example.test','orbit@example.test')$$,'42501',null,'Removed admin cannot reserve mail');

select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.tasks set status='todo' where id='e0900000-0000-4000-8000-000000000043';
select ok((select assignee_id is null from public.tasks where id='e0900000-0000-4000-8000-000000000043'),'Reopened task of former member becomes unassigned');
select public.invite_collaborator('e0900000-0000-4000-8000-000000000010','person@members.test');
reset role;
select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.accept_invitation((select id from public.my_invitations()));
select is((select role::text from public.workspace_members where workspace_id='e0900000-0000-4000-8000-000000000010' and user_id=auth.uid()),'member','Fresh invite restores member, never previous admin');
reset role;
select set_config('request.jwt.claim.sub','e0900000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.tasks set assignee_id='e0900000-0000-4000-8000-000000000002' where id='e0900000-0000-4000-8000-000000000043';
select is((public.remove_workspace_member('e0900000-0000-4000-8000-000000000010','e0900000-0000-4000-8000-000000000002','member',1)).affected_tasks,1,'Removal without replacement succeeds');
select ok((select assignee_id is null from public.tasks where id='e0900000-0000-4000-8000-000000000043'),'Pending assignment cleared without replacement');
reset role;
select * from finish();
rollback;
