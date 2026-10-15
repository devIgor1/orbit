begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data) values
 ('ee000000-0000-4000-8000-000000000001','notification-owner@example.test','{"full_name":"Autora"}'),
 ('ee000000-0000-4000-8000-000000000002','notification-member@example.test','{"full_name":"Responsável"}'),
 ('ee000000-0000-4000-8000-000000000003','notification-colleague@example.test','{"full_name":"Colega"}'),
 ('ee000000-0000-4000-8000-000000000004','notification-outsider@example.test','{"full_name":"Outra empresa"}');
insert into workspaces(id,name) values ('ee000000-0000-4000-8000-000000000010','Notificações'),
 ('ee000000-0000-4000-8000-000000000011','Outro workspace');
insert into workspace_members(workspace_id,user_id,role) values
 ('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000001','admin'),
 ('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000002','member'),
 ('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000003','member'),
 ('ee000000-0000-4000-8000-000000000011','ee000000-0000-4000-8000-000000000004','admin');
insert into projects(id,workspace_id,title,created_by) values
 ('ee000000-0000-4000-8000-000000000020','ee000000-0000-4000-8000-000000000010','Projeto','ee000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
insert into tasks(id,workspace_id,project_id,title,created_by,assignee_id) values
 ('ee000000-0000-4000-8000-000000000030','ee000000-0000-4000-8000-000000000010',
  'ee000000-0000-4000-8000-000000000020','Entrega','ee000000-0000-4000-8000-000000000001','ee000000-0000-4000-8000-000000000002');
select is((select count(*) from notifications where task_id='ee000000-0000-4000-8000-000000000030'),1::bigint,'Assignment notifies only the assignee');
select is((select kind::text from notifications where task_id='ee000000-0000-4000-8000-000000000030'),'assigned','Assignment has its own event type');
select is((select actor_name from notifications where task_id='ee000000-0000-4000-8000-000000000030'),'Autora','Actor comes from the authenticated profile');
update tasks set title='Entrega atualizada',assignee_id=assignee_id,status=status where id='ee000000-0000-4000-8000-000000000030';
select is((select count(*) from notifications where task_id='ee000000-0000-4000-8000-000000000030'),1::bigint,'Unchanged assignee/status do not duplicate notifications');
update tasks set assignee_id='ee000000-0000-4000-8000-000000000001' where id='ee000000-0000-4000-8000-000000000030';
select is((select count(*) from notifications where task_id='ee000000-0000-4000-8000-000000000030'),1::bigint,'Self-assignment is silent');
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000003',true);
insert into task_comments(workspace_id,task_id,author_id,body) values
 ('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000030','ee000000-0000-4000-8000-000000000003','Comentário');
select is((select count(*) from notifications where task_id='ee000000-0000-4000-8000-000000000030' and kind='commented'),1::bigint,'Creator who is also assignee receives one comment notification');
update tasks set assignee_id='ee000000-0000-4000-8000-000000000002' where id='ee000000-0000-4000-8000-000000000030';
update tasks set status='review' where id='ee000000-0000-4000-8000-000000000030';
select is((select count(*) from notifications where task_id='ee000000-0000-4000-8000-000000000030' and kind='status_changed'),2::bigint,'Status notifies creator and assignee');
select ok((select bool_and(task_status='review') from notifications where task_id='ee000000-0000-4000-8000-000000000030' and kind='status_changed'),'Status records the confirmed destination');
select is((select count(*) from notifications where recipient_id='ee000000-0000-4000-8000-000000000003'),0::bigint,'Actor is not notified');

select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from notifications),3::bigint,'RLS only exposes recipient notifications');
select is((notification_inbox('ee000000-0000-4000-8000-000000000010')->>'unread_count')::int,3,'Inbox count is scoped to the recipient');
select throws_ok($$select notification_inbox('ee000000-0000-4000-8000-000000000011')$$,'42501',null,'Inbox denies another workspace');
select throws_ok($$insert into notifications(workspace_id,recipient_id,actor_name,event_id,kind,project_id,task_id,task_title)
 values('ee000000-0000-4000-8000-000000000010',auth.uid(),'Forged',gen_random_uuid(),'assigned',
 'ee000000-0000-4000-8000-000000000020','ee000000-0000-4000-8000-000000000030','Forged')$$,'42501',null,'Clients cannot forge notifications');
select throws_ok($$update notifications set read_at=now()$$,'42501',null,'Direct writes are forbidden');
select throws_ok($$delete from notifications$$,'42501',null,'Direct deletion is forbidden');
select throws_ok($$select mark_notification_read('ee000000-0000-4000-8000-000000000010',gen_random_uuid())$$,'42501',null,'Unknown notification never reports success');
reset role;
select set_config('test.other_notification',(select id::text from notifications where recipient_id='ee000000-0000-4000-8000-000000000001' limit 1),true);
set local role authenticated;
select throws_ok($$select mark_notification_read('ee000000-0000-4000-8000-000000000010',current_setting('test.other_notification')::uuid)$$,'42501',null,'Cannot mark another recipient notification read');
select ok((mark_notification_read('ee000000-0000-4000-8000-000000000010',(select id from notifications limit 1))).read_at is not null,'Mark read returns the persisted timestamp');
select is((notification_inbox('ee000000-0000-4000-8000-000000000010')->>'unread_count')::int,2,'Count reflects a confirmed read');
select is(mark_all_notifications_read('ee000000-0000-4000-8000-000000000010',clock_timestamp()),2,'Mark all affects only remaining unread notifications');
select is(mark_all_notifications_read('ee000000-0000-4000-8000-000000000010',clock_timestamp()),0,'Repeated mark all explicitly reports no-op');
select is(jsonb_array_length(notification_inbox('ee000000-0000-4000-8000-000000000010',true)->'items'),0,'Unread filter returns confirmed empty');
select is(jsonb_array_length(notification_inbox('ee000000-0000-4000-8000-000000000010')->'items'),3,'Read notifications remain in history');
reset role;
select is((select count(*) from notifications where recipient_id='ee000000-0000-4000-8000-000000000001' and read_at is null),2::bigint,'Bulk read leaves other recipients untouched');

-- Equal timestamps exercise the UUID tie-breaker in keyset pagination.
insert into notifications(workspace_id,recipient_id,actor_name,event_id,kind,project_id,task_id,task_title,created_at)
select 'ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000002','Colega',gen_random_uuid(),'assigned',
 'ee000000-0000-4000-8000-000000000020','ee000000-0000-4000-8000-000000000030','Página '||n,clock_timestamp() - interval '1 day'
from generate_series(1,22) n;
update notifications set created_at='2026-01-01T10:00:00Z' where task_title like 'Página %';
set local role authenticated;
select set_config('test.notification_page',notification_inbox('ee000000-0000-4000-8000-000000000010',true)::text,true);
select is(jsonb_array_length(current_setting('test.notification_page')::jsonb->'items'),20,'Inbox has bounded pages');
select is((current_setting('test.notification_page')::jsonb->>'has_more')::boolean,true,'First page signals more items');
select is(jsonb_array_length(notification_inbox('ee000000-0000-4000-8000-000000000010',true,
 (current_setting('test.notification_page')::jsonb->'items'->19->>'created_at')::timestamptz,
 (current_setting('test.notification_page')::jsonb->'items'->19->>'id')::uuid)->'items'),2,'Cursor does not skip or repeat equal timestamps');
select throws_ok($$select notification_inbox('ee000000-0000-4000-8000-000000000010',false,now(),null)$$,'22023',null,'Partial cursors are rejected');
select is(mark_all_notifications_read('ee000000-0000-4000-8000-000000000010','2026-01-01T09:59:59Z'),0,'Bulk boundary does not read newer items');
reset role;

-- Removal invalidates both the RPC and direct RLS reads.
update workspace_members set removed_at=now() where workspace_id='ee000000-0000-4000-8000-000000000010' and user_id='ee000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from notifications),0::bigint,'Removed member cannot read existing notifications');
select throws_ok($$select notification_inbox('ee000000-0000-4000-8000-000000000010')$$,'42501',null,'Removed member receives permission error, not empty inbox');
select throws_ok($$select mark_all_notifications_read('ee000000-0000-4000-8000-000000000010',now())$$,'42501',null,'Removed member cannot mark notifications');
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
insert into task_comments(workspace_id,task_id,author_id,body) values
 ('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000030','ee000000-0000-4000-8000-000000000001','Sem avisar removidos');
select is((select count(*) from notifications where recipient_id='ee000000-0000-4000-8000-000000000002'),25::bigint,'Removed recipients do not get new events');

set local role anon;
select throws_ok($$select * from notifications$$,'42501',null,'Anonymous users cannot read notifications');
select throws_ok($$select notification_inbox('ee000000-0000-4000-8000-000000000010')$$,'42501',null,'Anonymous users cannot execute inbox RPC');
reset role;
select ok(not has_function_privilege('authenticated','private.deliver_task_notification(public.tasks, public.notification_kind, uuid, uuid[])','execute'),'Delivery helper is private');
select ok(not has_function_privilege('authenticated','private.broadcast_notification_change()','execute'),'Broadcast helper is private');
select * from finish();
rollback;
