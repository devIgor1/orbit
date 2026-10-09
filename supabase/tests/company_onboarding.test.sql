begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('c0900000-0000-4000-8000-000000000001','owner@onboarding.test',now(),'{"full_name":"Owner"}'),
('c0900000-0000-4000-8000-000000000002','member@onboarding.test',now(),'{"full_name":"Member"}'),
('c0900000-0000-4000-8000-000000000003','outside@onboarding.test',now(),'{"full_name":"Outside"}'),
('c0900000-0000-4000-8000-000000000004','unconfirmed@onboarding.test',null,'{"full_name":"Unconfirmed"}');
create temp table onboarding_ids(company uuid, invitation uuid, project uuid, task uuid);
grant all on onboarding_ids to authenticated;

set local role anon;
select throws_ok($$select public.create_company('Forbidden')$$,'42501',null,'Anonymous users cannot create companies');
select throws_ok($$select * from public.workspace_invitations$$,'42501',null,'Anonymous users cannot read invites');
reset role;

select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000004',true);
set local role authenticated;
select throws_ok($$select public.create_company('Unconfirmed')$$,'42501',null,'Unconfirmed accounts cannot create companies');
reset role;

select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok($$select public.create_company(' ')$$,'22023',null,'Backend validates company name');
insert into onboarding_ids(company) select (public.create_company('Test company')).id;
select is((select role::text from public.workspace_members where workspace_id=(select company from onboarding_ids)), 'admin', 'Company creator becomes admin');
select is((select active_workspace_id from public.profiles where id=auth.uid()),(select company from onboarding_ids),'Company selection is persisted');
update onboarding_ids set invitation=(public.invite_collaborator(company,' MEMBER@onboarding.test ')).id;
select is((select email from public.workspace_invitations where id=(select invitation from onboarding_ids)),'member@onboarding.test','Invitation email is normalized');
select is((public.invite_collaborator((select company from onboarding_ids),'member@onboarding.test')).id,(select invitation from onboarding_ids),'Repeated invitation renews the same pending invitation');
select throws_ok($$insert into public.workspace_members(workspace_id,user_id,role) select company,auth.uid(),'admin' from onboarding_ids$$,'42501',null,'Membership cannot be inserted directly');
with created as (insert into public.projects(workspace_id,title,created_by)
select company,'Shared Kanban',auth.uid() from onboarding_ids returning id)
update onboarding_ids set project=(select id from created);
reset role;

select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*) from public.workspaces where id=(select company from onboarding_ids)),0::bigint,'Outsider cannot read company');
select is((select count(*) from public.workspace_invitations),0::bigint,'Outsider cannot read invitations');
select throws_ok($$select public.accept_invitation((select invitation from onboarding_ids))$$,'42501',null,'Different email cannot accept invitation');
select throws_ok($$select public.select_company((select company from onboarding_ids))$$,'42501',null,'Outsider cannot select company');
select throws_ok($$select public.invite_collaborator((select company from onboarding_ids),'x@onboarding.test')$$,'42501',null,'Outsider cannot invite');
reset role;

-- A non-verified user with an invitation cannot gain access.
insert into public.workspace_invitations(id,workspace_id,email,created_by)
select 'c0900000-0000-4000-8000-000000000020',company,'unconfirmed@onboarding.test','c0900000-0000-4000-8000-000000000001' from onboarding_ids;
select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*) from public.my_invitations()),0::bigint,'Unconfirmed email sees no incoming invitations');
select throws_ok($$select public.accept_invitation('c0900000-0000-4000-8000-000000000020')$$,'42501',null,'Unconfirmed email cannot accept invitation');
reset role;

select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from public.my_invitations()),1::bigint,'Invitee sees only own valid invitation');
select is((select count(*) from public.projects where id=(select project from onboarding_ids)),0::bigint,'Invitation alone does not grant project access');
select is(public.accept_invitation((select invitation from onboarding_ids)),(select company from onboarding_ids),'Accept returns confirmed company');
select is(public.accept_invitation((select invitation from onboarding_ids)),(select company from onboarding_ids),'Accept is idempotent for same user');
select is((select role::text from public.workspace_members where user_id=auth.uid() and workspace_id=(select company from onboarding_ids)),'member','Collaborator receives member role');
select is((select active_workspace_id from public.profiles where id=auth.uid()),(select company from onboarding_ids),'Acceptance persists active company');
select is((select count(*) from public.my_invitations()),0::bigint,'Accepted invitations disappear from inbox');
select is((select count(*) from public.projects where id=(select project from onboarding_ids)),1::bigint,'Accepted collaborator can read Kanban project');
select throws_ok($$select public.invite_collaborator((select company from onboarding_ids),'x@onboarding.test')$$,'42501',null,'Member cannot invite');
select throws_ok($$select public.revoke_invitation('c0900000-0000-4000-8000-000000000020')$$,'42501',null,'Member cannot revoke invitations');
select throws_ok($$update public.profiles set active_workspace_id=(select company from onboarding_ids) where id=auth.uid()$$,'42501',null,'Company selection cannot bypass RPC');
select throws_ok($$insert into public.projects(workspace_id,title,created_by) select company,'Forbidden',auth.uid() from onboarding_ids$$,'42501',null,'Member cannot create projects');
with created as (insert into public.tasks(workspace_id,project_id,title,created_by)
select company,project,'Collaborator task',auth.uid() from onboarding_ids returning id)
update onboarding_ids set task=(select id from created);
update public.tasks set status='done' where id=(select task from onboarding_ids);
select is((select status::text from public.tasks where id=(select task from onboarding_ids)),'done','Collaborator can create and move Kanban task');
reset role;

select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok($$select public.invite_collaborator((select company from onboarding_ids),'member@onboarding.test')$$,'PT409',null,'Existing collaborator cannot be invited again');
update onboarding_ids set invitation=(public.invite_collaborator(company,'outside@onboarding.test')).id;
select is((public.revoke_invitation((select invitation from onboarding_ids))).status,'revoked','Admin can revoke pending invitation');
reset role;
select set_config('request.jwt.claim.sub','c0900000-0000-4000-8000-000000000003',true);
set local role authenticated;
select throws_ok($$select public.accept_invitation((select invitation from onboarding_ids))$$,'PT410',null,'Revoked invite cannot grant access');
reset role;
update public.workspace_invitations set status='pending', expires_at=now()-interval '1 minute' where id=(select invitation from onboarding_ids);
set local role authenticated;
select throws_ok($$select public.accept_invitation((select invitation from onboarding_ids))$$,'PT410',null,'Expired invite cannot grant access');
select is((select count(*) from public.my_invitations()),0::bigint,'Expired invites are excluded from inbox');
reset role;

select * from finish();
rollback;
