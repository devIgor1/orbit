begin;
create extension if not exists pgtap with schema extensions;
set search_path = public,extensions;
select plan(23);

insert into auth.users(id,email,raw_user_meta_data) values
 ('ac000000-0000-4000-8000-000000000001','github-account-admin@example.test','{"full_name":"Admin"}'),
 ('ac000000-0000-4000-8000-000000000002','github-account-member@example.test','{"full_name":"Member"}');
insert into public.workspaces(id,name) values('ac000000-0000-4000-8000-000000000010','Account connection tests');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000001','admin'),
 ('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000002','member');

select lives_ok($$select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','initial')$$,'Admin may start account connection');
select is((select expires_at from private.github_account_states where state_hash = 'initial'),now() + interval '30 minutes','Repository selection allows 30 minutes');
select throws_ok($$select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000010','member')$$,'42501',null,'Member cannot start');
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','initial')$$,'22023',null,'Cannot bypass setup stage');
select throws_ok($$select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000002','initial','next',20)$$,'22023',null,'Setup state belongs to initiating user');
select lives_ok($$select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000001','initial','next',20)$$,'Setup rotates state');
select is((select expires_at from private.github_account_states where state_hash = 'next'),now() + interval '10 minutes','OAuth still expires in 10 minutes');
select throws_ok($$select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000001','initial','replayed',999)$$,'22023',null,'Setup replay refused');
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000002','next')$$,'22023',null,'OAuth state belongs to initiating user');
select is(public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','next'),
 '{"workspace_id":"ac000000-0000-4000-8000-000000000010","installation_id":20}'::jsonb,'Original workspace and claimed installation preserved');
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','next')$$,'22023',null,'OAuth replay refused');

select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','expired');
update private.github_account_states set expires_at = now() - interval '1 minute';
select throws_ok($$select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000001','expired','expired-next',20)$$,'22023',null,'Expired setup refused');
select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','second');
select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000001','second','second-next',20);
update private.github_account_states set expires_at = now() - interval '1 minute';
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','second-next')$$,'22023',null,'Expired OAuth refused');

select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','third');
select public.advance_github_account_connection('ac000000-0000-4000-8000-000000000001','third','third-next',20);
update public.workspace_members set role = 'member' where user_id = 'ac000000-0000-4000-8000-000000000001';
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','third-next')$$,'42501',null,'Demotion during OAuth revokes connection authority');
update public.workspace_members set role = 'admin' where user_id = 'ac000000-0000-4000-8000-000000000001';

select is(public.finish_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010',
 '[{"id":10,"installation_id":20,"full_name":"org/one","default_branch":"main","private":true},
   {"id":11,"installation_id":20,"full_name":"org/two","default_branch":"main","private":false}]'),2,'Batch confirms affected repository count');
select throws_ok($$select public.finish_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010',
 '[{"id":12,"installation_id":20,"full_name":"org/three","default_branch":"main","private":true},
   {"id":13,"installation_id":20,"default_branch":"main","private":false}]')$$,'23502',null,'Invalid repository rolls back the entire batch');
select is((select count(*) from public.github_repositories where workspace_id = 'ac000000-0000-4000-8000-000000000010'),2::bigint,'No partial import persisted');

set local role anon;
select throws_ok($$select public.begin_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','anonymous')$$,'42501',null,'Anonymous cannot start privileged OAuth');
reset role;
set local role authenticated;
select throws_ok($$select public.finish_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','[]')$$,'42501',null,'Browser cannot forge repository proof');
select throws_ok($$select * from private.github_account_states$$,'42501',null,'Browser cannot read OAuth states');
select throws_ok($$select public.consume_github_account_connection('ac000000-0000-4000-8000-000000000001','third-next')$$,'42501',null,'Browser cannot consume privileged state');
reset role;
select throws_ok($$select public.finish_github_account_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','[]')$$,'22023',null,'Empty import cannot report success');
select throws_ok($$select public.finish_github_account_connection('ac000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000010','[]')$$,'42501',null,'Write rechecks membership');
select * from finish();
rollback;
