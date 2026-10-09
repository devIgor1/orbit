begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('e0910000-0000-4000-8000-000000000001','registered@availability.test',now(),'{"full_name":"Registered"}'),
('e0910000-0000-4000-8000-000000000002','pending@availability.test',null,'{"full_name":"Pending"}');
select set_config('request.headers','{"x-forwarded-for":"192.0.2.99"}',true);
set local role anon;
select is(public.check_registration_email(' REGISTERED@availability.test ')::text,'registered','Anonymous lookup normalizes email');
select is(public.check_registration_email('pending@availability.test')::text,'confirmation_pending','Unconfirmed account has a distinct status');
select is(public.check_registration_email('new@availability.test')::text,'available','New address is available');
select is(public.check_registration_email('%@availability.test')::text,'available','Lookup is exact, not a wildcard search');
select throws_ok($$select public.check_registration_email('invalid')$$,'22023',null,'Invalid input rejected');
select throws_ok($$select public.check_registration_email(null)$$,'22023',null,'Missing input rejected');
select throws_ok($$select public.check_registration_email(repeat('a',255)||'@example.test')$$,'22023',null,'Oversized input rejected');
select throws_ok($$select email from auth.users$$,'42501',null,'Anonymous cannot read account records');
select throws_ok($$select * from private.registration_email_limits$$,'42501',null,'Anonymous cannot inspect rate limit data');
reset role;
select is((select count(*) from auth.users where id in ('e0910000-0000-4000-8000-000000000001','e0910000-0000-4000-8000-000000000002')),2::bigint,'Lookup creates no account');
select is((select full_name from public.profiles where id='e0910000-0000-4000-8000-000000000001'),'Registered','Lookup preserves profile');
update private.registration_email_limits set requests=40
  where bucket=encode(sha256(convert_to('192.0.2.99','UTF8')),'hex');
set local role anon;
select throws_ok($$select public.check_registration_email('new@availability.test')$$,'PT429',null,'Per-client rate limit enforced');
reset role;
update private.registration_email_limits set window_start=now()-interval '2 minutes'
  where bucket=encode(sha256(convert_to('192.0.2.99','UTF8')),'hex');
set local role anon;
select is(public.check_registration_email('registered@availability.test')::text,'registered','Rate limit resets after its window');
reset role;
update private.registration_email_limits set requests=1200 where bucket='global';
select set_config('request.headers','{"x-forwarded-for":"192.0.2.100"}',true);
set local role anon;
select throws_ok($$select public.check_registration_email('new@availability.test')$$,'PT429',null,'Global cap applies even if clients change addresses');
reset role;
update private.registration_email_limits set requests=1 where bucket='global';
select set_config('request.headers','{}',true);
set local role anon;
select is(public.check_registration_email('registered@availability.test')::text,'registered','Missing IP uses a bounded shared bucket');
reset role;
set local role authenticated;
select is(public.check_registration_email('registered@availability.test')::text,'registered','Authenticated sessions get the same limited contract');
reset role;
select * from finish();
rollback;
