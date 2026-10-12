begin;
create extension if not exists pgtap with schema extensions;
set search_path = public,extensions;
select plan(19);

insert into auth.users(id,email,raw_user_meta_data) values
 ('ab000000-0000-4000-8000-000000000001','github-admin@example.test','{"full_name":"GitHub Admin"}'),
 ('ab000000-0000-4000-8000-000000000002','github-member@example.test','{"full_name":"GitHub Member"}'),
 ('ab000000-0000-4000-8000-000000000003','github-outsider@example.test','{"full_name":"GitHub Outsider"}');
insert into public.workspaces(id,name) values('ab000000-0000-4000-8000-000000000010','GitHub tests');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000001','admin'),
 ('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000002','member');
insert into public.projects(id,workspace_id,title,created_by) values
 ('ab000000-0000-4000-8000-000000000020','ab000000-0000-4000-8000-000000000010','GitHub project','ab000000-0000-4000-8000-000000000001');
select lives_ok($$select public.begin_github_connection('ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000010','org/repo','test-hash')$$,'Admin may start connection');
select throws_ok($$select public.begin_github_connection('ab000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000010','org/repo','member-hash')$$,'42501',null,'Member cannot connect');
select throws_ok($$select public.consume_github_connection('ab000000-0000-4000-8000-000000000002','test-hash')$$,'22023',null,'OAuth state is bound to initiating user');
select is(public.consume_github_connection('ab000000-0000-4000-8000-000000000001','test-hash')->>'repository_name','org/repo','State resolves server-side repository');
select throws_ok($$select public.consume_github_connection('ab000000-0000-4000-8000-000000000001','test-hash')$$,'22023',null,'OAuth state is single use');
select set_config('test.github.repo',public.finish_github_connection('ab000000-0000-4000-8000-000000000001',
 'ab000000-0000-4000-8000-000000000010','{"id":10,"installation_id":20,"full_name":"org/repo","default_branch":"main","private":true}')::text,true);

select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from public.github_repositories),1::bigint,'Member can read own company repository');
select throws_ok($$update public.github_repositories set installation_id = 999$$,'42501',null,'Browser cannot forge installation metadata');
select throws_ok($$select public.claim_github_jobs()$$,'42501',null,'Browser cannot invoke privileged worker');
select throws_ok($$select public.receive_github_event(gen_random_uuid(),'push','{}')$$,'42501',null,'Browser cannot forge webhook');
select throws_ok($$select public.finish_github_connection(auth.uid(),'ab000000-0000-4000-8000-000000000010','{}')$$,'42501',null,'Browser cannot bypass OAuth proof');
select throws_ok($$select public.set_project_github_repository('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000020',current_setting('test.github.repo')::uuid)$$,'42501',null,'Member cannot change project repository');
select throws_ok($$select * from private.github_oauth_states$$,'42501',null,'OAuth states are private');
reset role;

select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(public.set_project_github_repository('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000020',current_setting('test.github.repo')::uuid),current_setting('test.github.repo')::uuid,'Admin associates project');
select throws_ok($$select public.set_project_github_repository('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000020','ab000000-0000-4000-8000-000000000099')$$,'23503',null,'Unknown repository cannot be attached');
reset role;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*) from public.github_repositories),0::bigint,'Outsider sees no repositories');
select is((select count(*) from public.project_github_repositories),0::bigint,'Outsider sees no project connections');
reset role;
set local role anon;
select throws_ok($$select * from public.task_github_links$$,'42501',null,'Anonymous cannot read development links');
reset role;
select lives_ok($$select public.begin_github_connection('ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000010','org/repo','expired')$$,'Prepare expiration test');
update private.github_oauth_states set expires_at = now() - interval '1 minute';
select throws_ok($$select public.consume_github_connection('ab000000-0000-4000-8000-000000000001','expired')$$,'22023',null,'Expired OAuth state is refused');
select * from finish();
rollback;
