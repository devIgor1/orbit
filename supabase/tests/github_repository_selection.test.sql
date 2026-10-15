begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(27);
insert into auth.users(id,email,raw_user_meta_data) values
 ('af000000-0000-4000-8000-000000000001','repo-selection-admin@example.test','{"full_name":"Admin"}'),
 ('af000000-0000-4000-8000-000000000002','repo-selection-member@example.test','{"full_name":"Member"}');
insert into public.workspaces(id,name) values('af000000-0000-4000-8000-000000000010','Repository selection');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('af000000-0000-4000-8000-000000000010','af000000-0000-4000-8000-000000000001','admin'),
 ('af000000-0000-4000-8000-000000000010','af000000-0000-4000-8000-000000000002','member');
select finish_github_account_connection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',
 '[{"id":10,"installation_id":20,"full_name":"org/keep","default_branch":"main","private":true},{"id":11,"installation_id":20,"full_name":"org/remove","default_branch":"main","private":true},{"id":99,"installation_id":30,"full_name":"other/keep","default_branch":"main","private":true}]');
select is(begin_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,'choose',array[10,11,12]::bigint[])->'in_use_ids','[]'::jsonb,'Selection includes usage metadata');
select is((select count(*) from github_repositories where active),3::bigint,'Listing does not connect available repo 12');
select throws_ok($$select consume_github_repository_selection('af000000-0000-4000-8000-000000000001','choose')$$,'22023',null,'Cannot bypass explicit selection');
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000002','choose','foreign',array[10]::bigint[])$$,'22023',null,'Selection belongs to user');
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','choose','forged',array[99]::bigint[])$$,'22023',null,'Cannot select a repo not offered');
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','choose','duplicates',array[10,10]::bigint[])$$,'22023',null,'Duplicate IDs rejected');
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','choose','empty','{}'::bigint[])$$,'22023',null,'Empty selection rejected');
select lives_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','choose','final',array[10]::bigint[])$$,'Explicit selection rotates state');
select is((select expires_at from private.github_repository_states where state_hash='final'),now()+interval '10 minutes','Final consent expires');
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','choose','replay',array[12]::bigint[])$$,'22023',null,'Selection cannot replay');
select is(consume_github_repository_selection('af000000-0000-4000-8000-000000000001','final')->'selected_ids','[10]'::jsonb,'Final authorization receives only selected IDs');
select throws_ok($$select consume_github_repository_selection('af000000-0000-4000-8000-000000000001','final')$$,'22023',null,'Final callback cannot replay');
select is(save_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,
 '[{"id":10,"installation_id":20,"full_name":"org/keep","default_branch":"main","private":true}]',array[10,11]::bigint[]),1,'Confirms only selected repository count');
select is((select active from github_repositories where github_id=11),false,'Unselected prior connection disabled');
select is((select active from github_repositories where github_id=99),true,'Repository outside the reviewed set unchanged');
select is((select count(*) from github_repositories where github_id=12),0::bigint,'Unselected new repository never imported');
select is(save_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,
 '[{"id":10,"installation_id":20,"full_name":"org/keep","default_branch":"main","private":true},{"id":77,"installation_id":40,"full_name":"owner/collab","default_branch":"main","private":true}]',array[10]::bigint[]),2,'Combines own and collaborator installations');
select is((select installation_id from github_repositories where github_id=77),40::bigint,'Collaborator repository keeps its owner installation');
insert into projects(id,workspace_id,title,created_by) values('af000000-0000-4000-8000-000000000020','af000000-0000-4000-8000-000000000010','In use','af000000-0000-4000-8000-000000000001');
insert into tasks(id,workspace_id,project_id,title,created_by) values
 ('af000000-0000-4000-8000-000000000030','af000000-0000-4000-8000-000000000010','af000000-0000-4000-8000-000000000020','Linked task','af000000-0000-4000-8000-000000000001');
insert into project_github_repositories(workspace_id,project_id,repository_id) select
 workspace_id,'af000000-0000-4000-8000-000000000020',id from github_repositories where github_id=10;
select link_task_github('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',
 'af000000-0000-4000-8000-000000000030',(select id from github_repositories where github_id=10),'{"branch":"feat/test","head_repository_id":10,"pr_number":42}');
select throws_ok($$select save_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,
 '[{"id":12,"installation_id":20,"full_name":"org/new","default_branch":"main","private":true}]',array[10]::bigint[])$$,'55000',null,'Concurrent task link blocks removal');
select is((select count(*) from github_repositories where github_id=12),0::bigint,'Failed save rolls back new connections');
select is(begin_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,'expired',array[10]::bigint[])->'in_use_ids','[10]'::jsonb,'Task usage returned for interface protection');
update private.github_repository_states set expires_at=now()-interval '1 second';
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','expired','expired-final',array[10]::bigint[])$$,'22023',null,'Expired choice rejected');
select begin_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,'demoted',array[10]::bigint[]);
update workspace_members set role='member' where user_id='af000000-0000-4000-8000-000000000001';
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','demoted','denied',array[10]::bigint[])$$,'42501',null,'Role revalidated after listing');
update workspace_members set role='admin' where user_id='af000000-0000-4000-8000-000000000001';
select begin_github_discovery('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010','restart');
select is((select count(*) from private.github_repository_states),0::bigint,'Restart invalidates repository choices');
set local role authenticated;
select throws_ok($$select * from private.github_repository_states$$,'42501',null,'Browser cannot read private consent');
select throws_ok($$select save_github_repository_selection('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000010',20,'[]','{}')$$,'42501',null,'Browser cannot bypass validation to save');
reset role;
set local role anon;
select throws_ok($$select select_github_repositories('af000000-0000-4000-8000-000000000001','state','next',array[10]::bigint[])$$,'42501',null,'Anonymous cannot select');
reset role;
select * from finish();
rollback;
