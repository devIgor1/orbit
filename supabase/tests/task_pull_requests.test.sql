begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('b1000000-0000-4000-8000-000000000001','task-pr-admin@example.test','{"full_name":"Admin"}'),
 ('b1000000-0000-4000-8000-000000000002','task-pr-member@example.test','{"full_name":"Member"}'),
 ('b1000000-0000-4000-8000-000000000003','task-pr-other@example.test','{"full_name":"Other"}');
insert into workspaces(id,name) values
 ('b1000000-0000-4000-8000-000000000010','Task PRs'),('b1000000-0000-4000-8000-000000000011','Other company');
insert into workspace_members(workspace_id,user_id,role) values
 ('b1000000-0000-4000-8000-000000000010','b1000000-0000-4000-8000-000000000001','admin'),
 ('b1000000-0000-4000-8000-000000000010','b1000000-0000-4000-8000-000000000002','member'),
 ('b1000000-0000-4000-8000-000000000011','b1000000-0000-4000-8000-000000000003','admin');
insert into projects(id,workspace_id,title,created_by) values
 ('b1000000-0000-4000-8000-000000000020','b1000000-0000-4000-8000-000000000010','Shared project','b1000000-0000-4000-8000-000000000001'),
 ('b1000000-0000-4000-8000-000000000021','b1000000-0000-4000-8000-000000000010','Other project','b1000000-0000-4000-8000-000000000001');
insert into tasks(id,workspace_id,project_id,title,created_by) select
 ('b1000000-0000-4000-8000-00000000003'||n)::uuid,'b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000020','Task '||n,'b1000000-0000-4000-8000-000000000001' from generate_series(0,2) n;
select finish_github_account_connection('b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000010',
 '[{"id":10,"installation_id":20,"full_name":"org/frontend","default_branch":"main","private":true},
   {"id":11,"installation_id":20,"full_name":"org/backend","default_branch":"main","private":true},
   {"id":12,"installation_id":20,"full_name":"org/inactive","default_branch":"main","private":true}]');
select finish_github_account_connection('b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000011',
 '[{"id":13,"installation_id":21,"full_name":"other/private","default_branch":"main","private":true}]');
update github_repositories set active=false where github_id=12;
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000030',(select id from github_repositories where github_id=10),
 '{"branch":"feat/ui","head_repository_id":10,"pr_number":42}')$$,'22023',null,'Project without repository cannot link PRs');
insert into project_github_repositories(workspace_id,project_id,repository_id) select
 workspace_id,'b1000000-0000-4000-8000-000000000020',id from github_repositories where github_id=10;
select lives_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000030',(select id from github_repositories where github_id=10),
 '{"branch":"feat/ui","head_repository_id":10,"pr_number":42}')$$,'Member links a PR from the project repository');
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000031',(select id from github_repositories where github_id=11),
 '{"branch":"feat/api","head_repository_id":11,"pr_number":42}')$$,'22023',null,'Repository outside the project is refused');
select lives_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000031',(select id from github_repositories where github_id=10),
 '{"branch":"feat/api","head_repository_id":10,"pr_number":43}')$$,'Another task of the project links the same repository');
select is((select count(distinct repository_id) from task_github_links),1::bigint,'Project tasks share the project repository');
select is((select count(*) from private.github_sync_jobs),2::bigint,'Both confirmed links schedule synchronization');
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000030',(select id from github_repositories where github_id=10),
 '{"branch":"feat/api","head_repository_id":10,"pr_number":44}')$$,'23505',null,'Duplicate task link is refused');
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000032',(select id from github_repositories where github_id=10),
 '{"branch":"feat/ui","head_repository_id":10,"pr_number":43}')$$,'42501',null,'Outsider cannot link');
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000032',(select id from github_repositories where github_id=13),
 '{"branch":"feat/ui","head_repository_id":13,"pr_number":43}')$$,'22023',null,'Repository from another workspace is refused');
update project_github_repositories set repository_id=(select id from github_repositories where github_id=12)
 where project_id='b1000000-0000-4000-8000-000000000020';
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000032',(select id from github_repositories where github_id=12),
 '{"branch":"feat/ui","head_repository_id":12,"pr_number":43}')$$,'42501',null,'Inactive project repository is refused');
update project_github_repositories set repository_id=(select id from github_repositories where github_id=10)
 where project_id='b1000000-0000-4000-8000-000000000020';
update workspace_members set removed_at=now() where user_id='b1000000-0000-4000-8000-000000000002';
select throws_ok($$select link_task_github('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000010',
 'b1000000-0000-4000-8000-000000000032',(select id from github_repositories where github_id=10),
 '{"branch":"feat/ui","head_repository_id":10,"pr_number":43}')$$,'42501',null,'Removed member cannot link');
update workspace_members set removed_at=null where user_id='b1000000-0000-4000-8000-000000000002';
select throws_ok($$update task_github_links set repository_id=(select id from github_repositories where github_id=13)$$,
 '23503',null,'Foreign key enforces repository workspace even for direct SQL');
select throws_ok($$update task_github_links set project_id='b1000000-0000-4000-8000-000000000021'$$,
 '23503',null,'Foreign key enforces the actual project of the task');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*) from task_github_links),0::bigint,'RLS hides foreign task links');
select throws_ok($$select link_task_github(auth.uid(),'b1000000-0000-4000-8000-000000000011',
 'b1000000-0000-4000-8000-000000000032',gen_random_uuid(),'{}')$$,'42501',null,'Browser cannot bypass GitHub verification');
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select lives_ok($$select unlink_task_github('b1000000-0000-4000-8000-000000000010','b1000000-0000-4000-8000-000000000030')$$,'Member removes own workspace task link');
reset role;
select is(begin_github_repository_selection('b1000000-0000-4000-8000-000000000001',
 'b1000000-0000-4000-8000-000000000010',20,'task-choice',array[10,11]::bigint[])->'in_use_ids','[10]'::jsonb,
 'Project and task links protect repositories');
select throws_ok($$select save_github_repository_selection('b1000000-0000-4000-8000-000000000001',
 'b1000000-0000-4000-8000-000000000010',20,
 '[{"id":11,"installation_id":20,"full_name":"org/backend","default_branch":"main","private":true}]',array[10,11]::bigint[])$$,
 '55000',null,'Project repository cannot be deselected');
delete from task_github_links;
select throws_ok($$select save_github_repository_selection('b1000000-0000-4000-8000-000000000001',
 'b1000000-0000-4000-8000-000000000010',20,
 '[{"id":11,"installation_id":20,"full_name":"org/backend","default_branch":"main","private":true}]',array[10,11]::bigint[])$$,
 '55000',null,'Project association alone protects its repository');
select lives_ok($$select save_github_repository_selection('b1000000-0000-4000-8000-000000000001',
 'b1000000-0000-4000-8000-000000000010',20,
 '[{"id":10,"installation_id":20,"full_name":"org/frontend","default_branch":"main","private":true}]',array[10,11]::bigint[])$$,
 'Unused repository can be deselected');
select is((select active from github_repositories where github_id=11),false,'Unused repository disconnected');
select is((select active from github_repositories where github_id=10),true,'Project repository kept');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok($$select clear_project_github_repository('b1000000-0000-4000-8000-000000000010','b1000000-0000-4000-8000-000000000020')$$,
 '42501',null,'Member cannot clear the project repository');
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(clear_project_github_repository('b1000000-0000-4000-8000-000000000010','b1000000-0000-4000-8000-000000000020'),
 'b1000000-0000-4000-8000-000000000020'::uuid,'Admin clears the project repository');
reset role;
select is((select count(*) from project_github_repositories),0::bigint,'Project no longer has a repository');
select * from finish();
rollback;
