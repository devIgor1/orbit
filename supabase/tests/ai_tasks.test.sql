begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('a1600000-0000-4000-8000-000000000001','member@ai.test',now(),'{"full_name":"Member"}'),
('a1600000-0000-4000-8000-000000000002','outside@ai.test',now(),'{"full_name":"Outside"}');
insert into public.workspaces(id,name) values
('a1600000-0000-4000-8000-000000000010','AI A'),('a1600000-0000-4000-8000-000000000020','AI B');
insert into public.workspace_members(workspace_id,user_id,role) values
('a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000001','member'),
('a1600000-0000-4000-8000-000000000020','a1600000-0000-4000-8000-000000000002','admin');
insert into public.projects(id,workspace_id,title,created_by) values
('a1600000-0000-4000-8000-000000000030','a1600000-0000-4000-8000-000000000010','Checkout','a1600000-0000-4000-8000-000000000001'),
('a1600000-0000-4000-8000-000000000040','a1600000-0000-4000-8000-000000000020','Private','a1600000-0000-4000-8000-000000000002');

set local role anon;
select throws_ok($$select public.prepare_ai_task_request(gen_random_uuid(),'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))$$,'42501',null,'Anonymous cannot reserve');
select throws_ok($$select public.complete_ai_task_request(gen_random_uuid(),gen_random_uuid(),null,'Question')$$,'42501',null,'Anonymous cannot write');
reset role;
select set_config('request.jwt.claim.sub','a1600000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok($$select * from private.ai_task_requests$$,'42501',null,'Ledger is private');
select throws_ok($$insert into private.ai_task_attempts(user_id) values(auth.uid())$$,'42501',null,'Quota cannot be forged');
select throws_ok($$select public.prepare_ai_task_request(gen_random_uuid(),'a1600000-0000-4000-8000-000000000020','a1600000-0000-4000-8000-000000000040',repeat('a',64))$$,'42501',null,'Foreign workspace denied');
select throws_ok($$select public.prepare_ai_task_request(gen_random_uuid(),'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000040',repeat('a',64))$$,'42501',null,'Project/workspace mismatch denied');
select set_config('test.ai_request','a1600000-0000-4000-8000-000000000050',true);
select set_config('test.ai_lease',public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,
  'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->>'leaseToken',true);
select throws_ok($$select public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))$$,'PT409',null,'In-flight duplicate rejected');
select throws_ok($$select public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('b',64))$$,'22023',null,'Same key cannot change prompt');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,gen_random_uuid(),null,'Question')$$,'PT409',null,'Wrong lease denied');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"high","assignee_id":"a1600000-0000-4000-8000-000000000002","due_date":null}',null)$$,'23503',null,'Assignee from another workspace denied');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"urgent","assignee_id":null,"due_date":null}',null)$$,'22023',null,'Invalid priority rejected');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"high","assignee_id":null,"due_date":null,"created_by":"spoof"}',null)$$,'22023',null,'Caller cannot spoof author');

-- A policy introduced after this feature must still govern task creation.
reset role;
create policy ai_test_deny on public.tasks as restrictive for insert to authenticated with check(false);
set local role authenticated;
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"high","assignee_id":null,"due_date":null}',null)$$,'42501',null,'SECURITY INVOKER preserves task RLS');
reset role;
drop policy ai_test_deny on public.tasks;
set local role authenticated;
select set_config('test.ai_result',public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,
  '{"title":"Checkout","description":"Revisar validação","priority":"high","assignee_id":null,"due_date":"2026-10-23"}',null)::text,true);
select is(current_setting('test.ai_result')::jsonb->>'kind','created','Success confirmed after commit work');
select is((select count(*) from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),1::bigint,'Exactly one task persisted');
select is((select created_by from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),auth.uid(),'Author is authenticated caller');
select is((select status::text from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),'todo','Starts in A fazer');
select is((select due_date::text from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),'2026-10-23','Date-only preserved');
select is((select count(*) from public.activity_events where project_id='a1600000-0000-4000-8000-000000000030' and entity_type='task'),1::bigint,'History written once');
select is(public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,null,'ignored'),current_setting('test.ai_result')::jsonb,'Retry returns same confirmed task');
select is(public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->'result',current_setting('test.ai_result')::jsonb,'Lost HTTP response can be recovered');
select is((select count(*) from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),1::bigint,'Retry never duplicates');

select set_config('test.ai_request','a1600000-0000-4000-8000-000000000060',true);
select set_config('test.ai_lease',public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->>'leaseToken',true);
select is(public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,null,'Qual alteração?')->>'kind','clarification','Clarification is not a task');
select is((select count(*) from public.tasks where project_id='a1600000-0000-4000-8000-000000000030'),1::bigint,'Clarification performs no task insert');

select set_config('test.ai_request','a1600000-0000-4000-8000-000000000070',true);
select set_config('test.ai_lease',public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->>'leaseToken',true);
select ok(public.fail_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid),'Failed model call releases lease');
select set_config('test.ai_new_lease',public.prepare_ai_task_request(current_setting('test.ai_request')::uuid,'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->>'leaseToken',true);
select isnt(current_setting('test.ai_lease'),current_setting('test.ai_new_lease'),'Retry receives new lease');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_lease')::uuid,null,'Old result')$$,'PT409',null,'Late model response cannot commit');

reset role;
update public.workspace_members set removed_at=now() where user_id='a1600000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_new_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"high","assignee_id":null,"due_date":null}',null)$$,'42501',null,'Revoked membership during generation blocks write');
select throws_ok($$select public.prepare_ai_task_request('a1600000-0000-4000-8000-000000000050','a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))$$,'42501',null,'Revocation also blocks cached results');
reset role;
update public.workspace_members set removed_at=null,role='admin' where user_id='a1600000-0000-4000-8000-000000000001';
update public.projects set deleted_at=now() where id='a1600000-0000-4000-8000-000000000030';
set local role authenticated;
select throws_ok($$select public.prepare_ai_task_request(gen_random_uuid(),'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))$$,'42501',null,'Trashed project cannot spend tokens');
select throws_ok($$select public.complete_ai_task_request(current_setting('test.ai_request')::uuid,current_setting('test.ai_new_lease')::uuid,
  '{"title":"Checkout","description":null,"priority":"high","assignee_id":null,"due_date":null}',null)$$,'42501',null,'Project trashed during generation cannot receive task');
reset role;
update public.projects set deleted_at=null where id='a1600000-0000-4000-8000-000000000030';
insert into private.ai_task_attempts(user_id) select 'a1600000-0000-4000-8000-000000000001'::uuid from generate_series(1,10);
set local role authenticated;
select throws_ok($$select public.prepare_ai_task_request(gen_random_uuid(),'a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))$$,'PT429',null,'Quota limits inference attempts');
select is(public.prepare_ai_task_request('a1600000-0000-4000-8000-000000000050','a1600000-0000-4000-8000-000000000010','a1600000-0000-4000-8000-000000000030',repeat('a',64))->'result',current_setting('test.ai_result')::jsonb,'Confirmed result recoverable even at quota');
reset role;
select * from finish();
rollback;
