-- Existing deliveries keep their original provider payload on retries.
-- Deploy the function supporting both versions BEFORE applying this migration.
alter table private.invitation_email_jobs
  add column template_version smallint not null default 1
  check (template_version in (1, 2));

alter table private.invitation_email_jobs
  alter column template_version set default 2;

comment on column private.invitation_email_jobs.template_version is
  'Immutable rendering version; retries retain the original Resend payload.';
