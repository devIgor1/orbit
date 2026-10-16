begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('a1900000-0000-4000-8000-000000000001','feedback1@ai.test','{}'),
('a1900000-0000-4000-8000-000000000002','feedback2@ai.test','{}');
insert into public.workspaces(id,name) values ('a1900000-0000-4000-8000-000000000010','Quota feedback');
insert into public.workspace_members(workspace_id,user_id,role) values
('a1900000-0000-4000-8000-000000000010','a1900000-0000-4000-8000-000000000001','admin');
insert into public.projects(id,workspace_id,title,created_by) values
('a1900000-0000-4000-8000-000000000030','a1900000-0000-4000-8000-000000000010','Project','a1900000-0000-4000-8000-000000000001');

create function pg_temp.reserve_ai() returns jsonb language sql as $$
  select public.prepare_ai_task_request(gen_random_uuid(),'a1900000-0000-4000-8000-000000000010',
    'a1900000-0000-4000-8000-000000000030',repeat('a',64));
$$;
create function pg_temp.capture_ai_error() returns jsonb language plpgsql as $$
declare details text;
begin
  perform pg_temp.reserve_ai();
  return '{"allowed":true}'::jsonb;
exception when others then
  get stacked diagnostics details = pg_exception_detail;
  return jsonb_build_object('code',sqlstate,'message',sqlerrm,'quota',nullif(details,'')::jsonb);
end;
$$;
create function pg_temp.quota_at(at_time timestamptz default now()) returns jsonb language sql as $$
  select private.ai_task_quota_status('a1900000-0000-4000-8000-000000000001',
    'a1900000-0000-4000-8000-000000000010',at_time);
$$;
create function pg_temp.seed_attempts(person uuid, amount integer, age interval) returns void language sql as $$
  insert into private.ai_task_attempts(user_id,workspace_id,created_at)
    select person,'a1900000-0000-4000-8000-000000000010',now()-age from generate_series(1,amount);
$$;

select ok(not has_function_privilege('anon','private.ai_task_quota_status(uuid,uuid,timestamp with time zone)','execute'),
  'Anonymous cannot inspect usage');
select ok(not has_function_privilege('authenticated','private.ai_task_quota_status(uuid,uuid,timestamp with time zone)','execute'),
  'Members cannot inspect another identity using the helper');
select set_config('request.jwt.claim.sub','a1900000-0000-4000-8000-000000000001',true);
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',14,interval '5 minutes');
set local role authenticated;
select lives_ok($$select pg_temp.reserve_ai()$$,'User can use the increased 15th slot');
select set_config('test.quota_error',pg_temp.capture_ai_error()::text,true);
select is(current_setting('test.quota_error')::jsonb->>'message','AI_RATE_LIMITED','16th attempt reports user quota');
select is((current_setting('test.quota_error')::jsonb#>'{quota,blocked,0}') - 'retryAfterSeconds',
  '{"scope":"user","windowSeconds":600,"used":15,"limit":15}'::jsonb,'HTTP error detail carries real individual usage and cap');
select ok((current_setting('test.quota_error')::jsonb#>>'{quota,retryAfterSeconds}')::integer between 299 and 300,
  'Wait refers to oldest active slot, not a new ten-minute penalty');
select is(pg_temp.capture_ai_error()#>>'{quota,blocked,0,used}','15','Repeated blocked requests do not add attempts');
reset role;
select is((select count(*) from private.ai_task_attempts where workspace_id='a1900000-0000-4000-8000-000000000010'),
  15::bigint,'Blocked request consumes no quota');

-- Oversubscribed historical data needs more than one expiration to free a slot.
delete from private.ai_task_attempts where workspace_id='a1900000-0000-4000-8000-000000000010';
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',2,interval '599 seconds');
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',15,interval '480 seconds');
select is(pg_temp.quota_at()#>>'{blocked,0,used}','17','Historical overshoot reports actual usage');
select is(pg_temp.quota_at()->>'retryAfterSeconds','120','Waits until the Nth newest attempt expires');
select ok(pg_temp.quota_at(now()+interval '119 seconds') is not null,'Still blocked one second before release');
select is(pg_temp.quota_at(now()+interval '120 seconds'),null::jsonb,'Exact boundary releases one or more slots');

-- All scopes and both windows can be exhausted at once.
delete from private.ai_task_attempts where workspace_id='a1900000-0000-4000-8000-000000000010';
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',135,interval '2 hours');
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',15,interval '5 minutes');
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000002',540,interval '3 hours');
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000002',60,interval '4 minutes');
select is(pg_temp.quota_at(),'{"blocked":[
  {"scope":"user","windowSeconds":600,"used":15,"limit":15,"retryAfterSeconds":300},
  {"scope":"user","windowSeconds":86400,"used":150,"limit":150,"retryAfterSeconds":79200},
  {"scope":"workspace","windowSeconds":600,"used":75,"limit":75,"retryAfterSeconds":300},
  {"scope":"workspace","windowSeconds":86400,"used":750,"limit":750,"retryAfterSeconds":75600}
],"retryAfterSeconds":79200}'::jsonb,'Reports all four limits and waits for the slowest release');
select is(jsonb_array_length(pg_temp.quota_at(now()+interval '5 minutes')->'blocked'),2,'Daily limits remain after burst expires');
select is(pg_temp.quota_at(now()+interval '22 hours'),null::jsonb,'All limits allow a new attempt after the longest wait');
set local role authenticated;
select is(jsonb_array_length(pg_temp.capture_ai_error()#>'{quota,blocked}'),4,'Reservation includes every blocker, not only first failure');
select set_config('request.jwt.claim.sub','a1900000-0000-4000-8000-000000000002',true);
select is(pg_temp.capture_ai_error()->>'code','42501','Nonmembers cannot read counters even when limits are full');
select is(pg_temp.capture_ai_error()->'quota','null'::jsonb,'Permission errors expose no usage details');
reset role;

-- A fractional remaining second is rounded up, so retry is never premature.
delete from private.ai_task_attempts where workspace_id='a1900000-0000-4000-8000-000000000010';
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000001',15,interval '599.5 seconds');
select is(pg_temp.quota_at()->>'retryAfterSeconds','1','Subsecond wait rounds up');
select is(pg_temp.quota_at(now()+interval '0.5 seconds'),null::jsonb,'Window excludes attempts exactly at its boundary');

-- Daily and company-only failures keep their own scope without suggesting a user cap.
delete from private.ai_task_attempts where workspace_id='a1900000-0000-4000-8000-000000000010';
select pg_temp.seed_attempts('a1900000-0000-4000-8000-000000000002',750,interval '2 hours');
select set_config('request.jwt.claim.sub','a1900000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(pg_temp.capture_ai_error()->>'message','AI_WORKSPACE_RATE_LIMITED','Company-only failures retain the existing code');
select is((pg_temp.capture_ai_error()#>'{quota,blocked,0}') - 'retryAfterSeconds',
  '{"scope":"workspace","windowSeconds":86400,"used":750,"limit":750}'::jsonb,'Company daily detail does not blame the current user');
reset role;
select * from finish();
rollback;
