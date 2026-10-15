begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('ef000000-0000-4000-8000-000000000001','invite-owner@example.test',now(),'{"full_name":"Owner"}'),
 ('ef000000-0000-4000-8000-000000000002','invite-recipient@example.test',now(),'{"full_name":"Recipient"}'),
 ('ef000000-0000-4000-8000-000000000003','invite-outsider@example.test',now(),'{"full_name":"Outsider"}'),
 ('ef000000-0000-4000-8000-000000000004','invite-unconfirmed@example.test',null,'{"full_name":"Unconfirmed"}');
insert into workspaces(id,name) values
 ('ef000000-0000-4000-8000-000000000010','Inviting company'),
 ('ef000000-0000-4000-8000-000000000011','Current company');
insert into workspace_members(workspace_id,user_id,role) values
 ('ef000000-0000-4000-8000-000000000010','ef000000-0000-4000-8000-000000000001','admin'),
 ('ef000000-0000-4000-8000-000000000011','ef000000-0000-4000-8000-000000000002','admin');
update profiles set active_workspace_id='ef000000-0000-4000-8000-000000000011' where id='ef000000-0000-4000-8000-000000000002';

select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select invite_collaborator('ef000000-0000-4000-8000-000000000010','INVITE-RECIPIENT@example.test')$$,'Invitation creation succeeds with broadcast trigger');
reset role;
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),1::bigint,'Creation emits one signal to the verified recipient');
-- realtime.send adds its own transport ID to the otherwise empty payload.
select ok((select bool_and(payload-'id'='{}'::jsonb and payload->>'id'=id::text and private and event='invitations_changed') from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),'Signal is private and carries no invitation data');
update workspace_invitations set created_by=created_by where workspace_id='ef000000-0000-4000-8000-000000000010';
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),1::bigint,'Unrelated updates do not emit duplicate signals');

select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000002',true);
select set_config('realtime.topic','invitations:ef000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from my_invitations()),1::bigint,'Invitation appears while another workspace is active');
select is((select workspace_name from my_invitations()),'Inviting company','Invitation includes the invited company name');
select is((select count(*) from workspaces where id='ef000000-0000-4000-8000-000000000010'),0::bigint,'Receiving a signal grants no access to the inviting workspace');
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),1::bigint,'Recipient can receive its account signal without workspace membership');
reset role;

select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*) from my_invitations()),0::bigint,'Another account cannot read the invitation');
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),0::bigint,'Another account cannot receive the private signal');
reset role;

-- Expiration is checked by the backend on every read, without waiting for a trigger.
update workspace_invitations set expires_at=now()-interval '1 second' where email='invite-recipient@example.test';
select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from my_invitations()),0::bigint,'Expired invitations disappear');
reset role;
select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select invite_collaborator('ef000000-0000-4000-8000-000000000010','invite-recipient@example.test')$$,'Renewal remains compatible with realtime');
select revoke_invitation(id) from workspace_invitations where email='invite-recipient@example.test';
reset role;
select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from my_invitations()),0::bigint,'Revoked invitations disappear');
reset role;

insert into workspace_invitations(workspace_id,email,created_by) values
 ('ef000000-0000-4000-8000-000000000010','invite-recipient@example.test','ef000000-0000-4000-8000-000000000001'),
 ('ef000000-0000-4000-8000-000000000010','invite-unconfirmed@example.test','ef000000-0000-4000-8000-000000000001');
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000004'),0::bigint,'Unverified addresses receive no signal');
set local role authenticated;
select accept_invitation(id) from my_invitations();
select is((select count(*) from my_invitations()),0::bigint,'Accepted invitation leaves the pending inbox');
reset role;
select is((select count(*) from realtime.messages where topic='invitations:ef000000-0000-4000-8000-000000000002'),6::bigint,'Creation, expiry update, renewal, revocation, recreation and acceptance each emit one signal');
select ok(not has_function_privilege('authenticated','private.broadcast_invitation_change()','execute'),'Clients cannot invoke the trusted broadcast helper');
select ok(not has_function_privilege('anon','private.broadcast_invitation_change()','execute'),'Anonymous callers cannot invoke the broadcast helper');
select * from finish();
rollback;
