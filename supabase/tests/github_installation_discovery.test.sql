begin;
create extension if not exists pgtap with schema extensions;
set search_path = public,extensions;
select plan(25);
insert into auth.users(id,email,raw_user_meta_data) values
 ('ae000000-0000-4000-8000-000000000001','github-discovery-admin@example.test','{"full_name":"Admin"}'),
 ('ae000000-0000-4000-8000-000000000002','github-discovery-member@example.test','{"full_name":"Member"}');
insert into public.workspaces(id,name) values('ae000000-0000-4000-8000-000000000010','Discovery tests');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('ae000000-0000-4000-8000-000000000010','ae000000-0000-4000-8000-000000000001','admin'),
 ('ae000000-0000-4000-8000-000000000010','ae000000-0000-4000-8000-000000000002','member');

select lives_ok($$select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','discovery')$$,'Admin starts discovery');
select is((select expires_at from private.github_discovery_states where state_hash='discovery'),now()+interval '10 minutes','Discovery expires in 10 minutes');
select throws_ok($$select begin_github_discovery('ae000000-0000-4000-8000-000000000002','ae000000-0000-4000-8000-000000000010','member')$$,'42501',null,'Member cannot initiate');
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','discovery','bypass',20)$$,'22023',null,'Selection requires completed discovery');
select throws_ok($$select consume_github_discovery('ae000000-0000-4000-8000-000000000002','discovery')$$,'22023',null,'Discovery belongs to user');
select is(consume_github_discovery('ae000000-0000-4000-8000-000000000001','discovery'),'ae000000-0000-4000-8000-000000000010'::uuid,'Preserves original workspace');
select throws_ok($$select consume_github_discovery('ae000000-0000-4000-8000-000000000001','discovery')$$,'22023',null,'Discovery cannot replay');
select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','choice',array[20,30]::bigint[]);
select throws_ok($$select consume_github_discovery('ae000000-0000-4000-8000-000000000001','choice')$$,'22023',null,'Choice cannot be used as discovery');
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000002','choice','foreign',20)$$,'22023',null,'Selection belongs to user');
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','choice','forged',99)$$,'22023',null,'Installation must be offered by GitHub');
select lives_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','choice','oauth',20)$$,'Existing installation goes directly to OAuth');
select is((select expires_at from private.github_account_states where state_hash='oauth'),now()+interval '10 minutes','Selected OAuth expires in 10 minutes');
select is(consume_github_account_connection('ae000000-0000-4000-8000-000000000001','oauth'),'{"workspace_id":"ae000000-0000-4000-8000-000000000010","installation_id":20}'::jsonb,'Selected installation and original workspace survive OAuth');
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','choice','replay',30)$$,'22023',null,'Choice cannot replay');
select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','other',array[20]::bigint[]);
select lives_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','other','setup',null)$$,'Another account starts setup');
select is((select expires_at from private.github_account_states where state_hash='setup'),now()+interval '30 minutes','New installation allows 30 minutes');
select throws_ok($$select consume_github_account_connection('ae000000-0000-4000-8000-000000000001','setup')$$,'22023',null,'New installation cannot bypass callback');
select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','expired',array[20]::bigint[]);
select is((select count(*) from private.github_account_states where state_hash='setup'),0::bigint,'Restart invalidates old setup');
update private.github_discovery_states set expires_at=now()-interval '1 second';
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','expired','bad',20)$$,'22023',null,'Expired choice refused');
select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','demoted',array[20]::bigint[]);
update public.workspace_members set role='member' where user_id='ae000000-0000-4000-8000-000000000001';
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','demoted','denied',20)$$,'42501',null,'Demotion revokes selection');
update public.workspace_members set role='admin' where user_id='ae000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select begin_github_discovery('ae000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000010','forged-choice',array[99]::bigint[])$$,'42501',null,'Browser cannot forge offered installations');
select throws_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','demoted','bypass',20)$$,'42501',null,'Browser cannot call privileged selection');
select throws_ok($$select * from private.github_discovery_states$$,'42501',null,'Browser cannot read selection state');
reset role;
set local role anon;
select throws_ok($$select consume_github_discovery('ae000000-0000-4000-8000-000000000001','demoted')$$,'42501',null,'Anonymous cannot consume discovery');
reset role;
set local role service_role;
select lives_ok($$select select_github_installation('ae000000-0000-4000-8000-000000000001','demoted','service-oauth',20)$$,'Service can select after validations');
reset role;
select * from finish();
rollback;
