begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('a1800000-0000-4000-8000-000000000001','reject1@ai.test','{}'),
('a1800000-0000-4000-8000-000000000002','reject2@ai.test','{}');
insert into public.workspaces(id,name) values ('a1800000-0000-4000-8000-000000000010','Rejections');
insert into public.workspace_members(workspace_id,user_id,role) values
('a1800000-0000-4000-8000-000000000010','a1800000-0000-4000-8000-000000000001','admin'),
('a1800000-0000-4000-8000-000000000010','a1800000-0000-4000-8000-000000000002','admin');
insert into public.projects(id,workspace_id,title,created_by) values
('a1800000-0000-4000-8000-000000000030','a1800000-0000-4000-8000-000000000010','Rejections','a1800000-0000-4000-8000-000000000001');
create function pg_temp.reserve_ai(request uuid) returns jsonb language sql as $$
  select public.prepare_ai_task_request(request,'a1800000-0000-4000-8000-000000000010','a1800000-0000-4000-8000-000000000030',repeat('a',64));
$$;
create function pg_temp.reject_ai(reason text) returns jsonb language sql as $$
  select public.reject_ai_task_request(current_setting('test.request')::uuid,current_setting('test.lease')::uuid,reason);
$$;
set local role anon;
select throws_ok($$select public.reject_ai_task_request(gen_random_uuid(),gen_random_uuid(),'out_of_scope')$$,'42501',null,'Anonymous cannot write refusals');
reset role;
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('test.request','a1800000-0000-4000-8000-000000000050',true);
select set_config('test.lease',pg_temp.reserve_ai(current_setting('test.request')::uuid)->>'leaseToken',true);
select throws_ok($$select pg_temp.reject_ai('arbitrary answer')$$,'22023',null,'Free-form answers cannot be persisted as refusals');
select throws_ok($$select pg_temp.reject_ai(null)$$,'22023',null,'Missing refusal code is rejected');
select throws_ok($$select public.reject_ai_task_request(current_setting('test.request')::uuid,gen_random_uuid(),'out_of_scope')$$,
  'PT409',null,'A refusal needs the current lease');
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000002',true);
select throws_ok($$select pg_temp.reject_ai('out_of_scope')$$,'42501',null,'Another member cannot finish someone else request');
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000001',true);
select is(pg_temp.reject_ai('out_of_scope'),'{"kind":"rejected","reason":"out_of_scope"}'::jsonb,'Refusal contains only a fixed code');
select is(pg_temp.reject_ai('unsupported_action'),'{"kind":"rejected","reason":"out_of_scope"}'::jsonb,'Retry cannot replace confirmed refusal');
select is(public.complete_ai_task_request(current_setting('test.request')::uuid,current_setting('test.lease')::uuid,
  '{"title":"Must not insert","description":null,"priority":"medium","assignee_id":null,"due_date":null}',null)->>'kind',
  'rejected','Creation RPC cannot overwrite a refusal');
select is((select count(*) from public.tasks where workspace_id='a1800000-0000-4000-8000-000000000010'),0::bigint,'No task is created for refusal');
select is((select count(*) from public.activity_events where workspace_id='a1800000-0000-4000-8000-000000000010' and entity_type='task'),0::bigint,'No task history is created for refusal');
reset role;
select is((select count(*) from private.ai_task_attempts where workspace_id='a1800000-0000-4000-8000-000000000010'),1::bigint,'Refusal consumes the original attempt');
insert into private.ai_task_attempts(user_id,workspace_id)
select 'a1800000-0000-4000-8000-000000000002','a1800000-0000-4000-8000-000000000010' from generate_series(1,74);
set local role authenticated;
select is(pg_temp.reserve_ai(current_setting('test.request')::uuid)->'result','{"kind":"rejected","reason":"out_of_scope"}'::jsonb,
  'Confirmed refusal is recovered even when company quota is full');
select throws_ok($$select pg_temp.reserve_ai(gen_random_uuid())$$,'PT429','AI_WORKSPACE_RATE_LIMITED','A refusal counts towards the company cap');
reset role;
delete from private.ai_task_attempts where workspace_id='a1800000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('test.request','a1800000-0000-4000-8000-000000000060',true);
select set_config('test.lease',pg_temp.reserve_ai(current_setting('test.request')::uuid)->>'leaseToken',true);
select ok(public.fail_ai_task_request(current_setting('test.request')::uuid,current_setting('test.lease')::uuid),'Failed model call releases lease');
select throws_ok($$select pg_temp.reject_ai('instruction_override')$$,'PT409',null,'Expired lease cannot save refusal');
select set_config('test.lease',pg_temp.reserve_ai(current_setting('test.request')::uuid)->>'leaseToken',true);
select is(pg_temp.reject_ai('instruction_override')->>'reason','instruction_override','Prompt injection refusal is supported');
reset role;
select is((select count(*) from private.ai_task_attempts where workspace_id='a1800000-0000-4000-8000-000000000010'),2::bigint,'Failure and retry both count');
update public.workspace_members set removed_at=now() where workspace_id='a1800000-0000-4000-8000-000000000010' and user_id='a1800000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select pg_temp.reject_ai('unsupported_action')$$,'42501',null,'Revoked access cannot recover refusal');
select throws_ok($$select pg_temp.reserve_ai(current_setting('test.request')::uuid)$$,'42501',null,'Replay rechecks membership');
reset role;
select * from finish();
rollback;
