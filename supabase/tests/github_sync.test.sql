begin;
create extension if not exists pgtap with schema extensions;
set search_path = public,extensions;
select plan(19);
insert into auth.users(id,email,raw_user_meta_data) values('ac000000-0000-4000-8000-000000000001','github-sync@example.test','{"full_name":"GitHub Sync"}');
insert into public.workspaces(id,name) values('ac000000-0000-4000-8000-000000000010','Sync tests');
insert into public.workspace_members(workspace_id,user_id,role) values('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000001','admin');
insert into public.projects(id,workspace_id,title,created_by) values('ac000000-0000-4000-8000-000000000020','ac000000-0000-4000-8000-000000000010','Sync project','ac000000-0000-4000-8000-000000000001');
insert into public.tasks(id,workspace_id,project_id,title,created_by) values('ac000000-0000-4000-8000-000000000030','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000020','Sync task','ac000000-0000-4000-8000-000000000001');
select set_config('test.github.repo',public.finish_github_connection('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','{"id":10,"installation_id":20,"full_name":"org/repo","default_branch":"main","private":true}')::text,true);
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
select public.set_project_github_repository('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000020',current_setting('test.github.repo')::uuid);
select set_config('test.github.link',public.link_task_github('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000030',current_setting('test.github.repo')::uuid,'{"branch":"feat/login","head_repository_id":10,"pr_number":null}')::text,true);
select set_config('request.jwt.claim.sub','',true);
select set_config('test.github.job',(public.claim_github_jobs()->0)::text,true);
select is(jsonb_array_length(public.claim_github_jobs()),0,'A live lease excludes competing workers');
select set_config('test.github.lease',current_setting('test.github.job')::jsonb->>'lease',true);
select lives_ok($$select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":null,"pr_title":null,"pr_state":"branch","merged_at":null}')$$,'Apply branch snapshot');
select is((select status::text from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'in_progress','Branch moves task into progress');
select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":42,"pr_title":"Login","pr_state":"open","merged_at":null}');
select is((select status::text from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'review','Ready PR moves task to review');
select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":42,"pr_title":"Login","pr_state":"closed","merged_at":null}');
select is((select status::text from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'in_progress','Closed without merge stays unfinished');
select is((select comment_status from public.task_github_links where id = current_setting('test.github.link')::uuid),'not_due','No comment before merge');
select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":42,"pr_title":"Login","pr_state":"merged","merged_at":"2026-10-11T12:00:00Z"}');
select is((select status::text from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'done','Merge completes task');
select ok((select completed_at is not null from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'Merge sets completion date');
select ok((select bool_and(actor_id is null) from public.activity_events where action = 'github_status_changed' and task_id = 'ac000000-0000-4000-8000-000000000030'),'Automation is not attributed to a human');
select throws_ok($$select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":42,"pr_state":"open","merged_at":null}')$$,'22023',null,'Stale snapshot cannot undo a merge');
select public.finish_github_job(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,1,'GITHUB_FAILED');
select is((select comment_status from public.task_github_links where id = current_setting('test.github.link')::uuid),'error','Failed comment is explicit');
select is((select status::text from public.tasks where id = 'ac000000-0000-4000-8000-000000000030'),'done','Comment failure does not undo confirmed merge');
select ok((select due_at > now() from private.github_sync_jobs where link_id = current_setting('test.github.link')::uuid),'Failure schedules a delayed retry');
select is(public.receive_github_event('ac000000-0000-4000-8000-000000000040','pull_request','{"installation":{"id":20},"repository":{"id":10},"pull_request":{"number":42}}'),true,'New delivery schedules refresh');
select is(public.receive_github_event('ac000000-0000-4000-8000-000000000040','pull_request','{"installation":{"id":20},"repository":{"id":10},"pull_request":{"number":42}}'),false,'Duplicate delivery is ignored');
select set_config('test.github.job',(public.claim_github_jobs()->0)::text,true);
select set_config('test.github.lease',current_setting('test.github.job')::jsonb->>'lease',true);
select public.apply_github_snapshot(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,
 '{"branch":"feat/login","head_repository_id":10,"pr_number":42,"pr_title":"Login","pr_state":"merged","merged_at":"2026-10-11T12:00:00Z"}');
select public.finish_github_job(current_setting('test.github.link')::uuid,current_setting('test.github.lease')::uuid,(current_setting('test.github.job')::jsonb->>'generation')::integer,null,123);
select is((select comment_id from public.task_github_links where id = current_setting('test.github.link')::uuid),123::bigint,'Provider receipt confirms comment');
select is((select count(*) from private.github_comment_receipts where task_id = 'ac000000-0000-4000-8000-000000000030'),1::bigint,'Receipt is durable');
select public.receive_github_event('ac000000-0000-4000-8000-000000000041','installation','{"installation":{"id":20},"action":"deleted"}');
select is((select active from public.github_repositories where id = current_setting('test.github.repo')::uuid),false,'Uninstall disables connection');
select is((select sync_status from public.task_github_links where id = current_setting('test.github.link')::uuid),'unavailable','Uninstall exposes unavailable state');
select * from finish();
rollback;
