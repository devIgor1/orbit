begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('a1700000-0000-4000-8000-000000000001','quota1@ai.test','{}'),
('a1700000-0000-4000-8000-000000000002','quota2@ai.test','{}'),
('a1700000-0000-4000-8000-000000000003','quota3@ai.test','{}');
insert into public.workspaces(id,name) values
('a1700000-0000-4000-8000-000000000010','Quota A'),('a1700000-0000-4000-8000-000000000020','Quota B');
insert into public.workspace_members(workspace_id,user_id,role)
select company,person,'admin'::public.member_role from
unnest(array['a1700000-0000-4000-8000-000000000010'::uuid,'a1700000-0000-4000-8000-000000000020'::uuid]) company,
unnest(array['a1700000-0000-4000-8000-000000000001'::uuid,'a1700000-0000-4000-8000-000000000002'::uuid]) person;
insert into public.projects(id,workspace_id,title,created_by) values
('a1700000-0000-4000-8000-000000000030','a1700000-0000-4000-8000-000000000010','Project A','a1700000-0000-4000-8000-000000000001'),
('a1700000-0000-4000-8000-000000000031','a1700000-0000-4000-8000-000000000010','Project A2','a1700000-0000-4000-8000-000000000001'),
('a1700000-0000-4000-8000-000000000040','a1700000-0000-4000-8000-000000000020','Project B','a1700000-0000-4000-8000-000000000001');

create function pg_temp.reserve_ai(company uuid default 'a1700000-0000-4000-8000-000000000010',
  project uuid default 'a1700000-0000-4000-8000-000000000030') returns jsonb language sql as $$
  select public.prepare_ai_task_request(gen_random_uuid(),company,project,repeat('a',64));
$$;
-- Other members' attempts share the company budget, regardless of the project.
insert into private.ai_task_attempts(user_id,workspace_id)
select 'a1700000-0000-4000-8000-000000000003','a1700000-0000-4000-8000-000000000010' from generate_series(1,74);
select set_config('request.jwt.claim.sub','a1700000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select pg_temp.reserve_ai()$$,'The 75th company attempt is allowed');
select set_config('request.jwt.claim.sub','a1700000-0000-4000-8000-000000000002',true);
select throws_ok($$select pg_temp.reserve_ai()$$,'PT429','AI_WORKSPACE_RATE_LIMITED','Different user cannot exceed company burst');
select throws_ok($$select pg_temp.reserve_ai('a1700000-0000-4000-8000-000000000010','a1700000-0000-4000-8000-000000000031')$$,
  'PT429','AI_WORKSPACE_RATE_LIMITED','Changing project cannot bypass company burst');
select lives_ok($$select pg_temp.reserve_ai('a1700000-0000-4000-8000-000000000020','a1700000-0000-4000-8000-000000000040')$$,
  'One company cannot exhaust another company budget');
reset role;
select is((select count(*) from private.ai_task_attempts where workspace_id='a1700000-0000-4000-8000-000000000010'),75::bigint,'Rejected reservations add no attempts');
delete from private.ai_task_attempts where user_id::text like 'a1700000-%';
-- Daily quota still applies when all previous attempts are outside the burst window.
insert into private.ai_task_attempts(user_id,workspace_id,created_at)
select 'a1700000-0000-4000-8000-000000000003','a1700000-0000-4000-8000-000000000010',now()-interval '2 hours' from generate_series(1,749);
set local role authenticated;
select lives_ok($$select pg_temp.reserve_ai()$$,'The 750th daily company attempt is allowed');
select throws_ok($$select pg_temp.reserve_ai()$$,'PT429','AI_WORKSPACE_RATE_LIMITED','The 751st daily attempt is denied');
reset role;
delete from private.ai_task_attempts where user_id::text like 'a1700000-%';
insert into private.ai_task_attempts(user_id,workspace_id,created_at)
select 'a1700000-0000-4000-8000-000000000003','a1700000-0000-4000-8000-000000000010',now()-interval '24 hours' from generate_series(1,750);
insert into private.ai_task_attempts(user_id,workspace_id,created_at)
select 'a1700000-0000-4000-8000-000000000003','a1700000-0000-4000-8000-000000000010',now()-interval '10 minutes' from generate_series(1,75);
set local role authenticated;
select lives_ok($$select pg_temp.reserve_ai()$$,'Expired windows no longer block company use');
reset role;
-- Old rows lacking workspace retain the existing individual limit.
insert into private.ai_task_attempts(user_id,created_at)
select 'a1700000-0000-4000-8000-000000000001',now()-interval '2 hours' from generate_series(1,150);
select set_config('request.jwt.claim.sub','a1700000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok($$select pg_temp.reserve_ai('a1700000-0000-4000-8000-000000000020','a1700000-0000-4000-8000-000000000040')$$,
  'PT429','AI_RATE_LIMITED','Legacy attempts and cross-company user quota remain enforced');
reset role;
delete from public.workspaces where id='a1700000-0000-4000-8000-000000000010';
select is((select count(*) from private.ai_task_attempts where user_id='a1700000-0000-4000-8000-000000000002' and workspace_id is null),
  1::bigint,'Deleting a company does not erase individual usage');
select * from finish();
rollback;
