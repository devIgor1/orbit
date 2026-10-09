-- Public registration feedback returns only a status, never account records.
create type public.registration_email_status as enum ('available', 'registered', 'confirmation_pending');
create table private.registration_email_limits (
  bucket text primary key,
  window_start timestamptz not null,
  requests integer not null check (requests > 0)
);
create index registration_email_limits_window on private.registration_email_limits(window_start);
revoke all on private.registration_email_limits from public, anon, authenticated;

create function public.check_registration_email(candidate_email text)
returns public.registration_email_status
language plpgsql security definer set search_path = '' as $$
declare
  normalized text := lower(trim(candidate_email));
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  client_ip text;
  fingerprint text;
  current_window timestamptz := date_trunc('minute', clock_timestamp());
  bucket_name text;
  request_count integer;
  confirmed boolean;
begin
  if normalized is null or char_length(normalized) > 254
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  -- Forwarded IP is supplied by the API gateway. A shared fallback and a global
  -- cap also bound requests when headers are absent or clients vary addresses.
  client_ip := coalesce(nullif(trim(split_part(headers->>'x-forwarded-for', ',', 1)), ''), 'unknown');
  fingerprint := encode(sha256(convert_to(client_ip, 'UTF8')), 'hex');
  foreach bucket_name in array array['global', fingerprint] loop
    insert into private.registration_email_limits(bucket, window_start, requests)
      values(bucket_name, current_window, 1)
    on conflict(bucket) do update set
      requests = case when registration_email_limits.window_start = current_window
        then registration_email_limits.requests + 1 else 1 end,
      window_start = current_window
    returning requests into request_count;
    if request_count > (case when bucket_name = 'global' then 1200 else 40 end) then
      raise exception 'Too many email checks' using errcode = 'PT429';
    end if;
  end loop;
  delete from private.registration_email_limits where window_start < current_window - interval '1 day';
  select u.email_confirmed_at is not null into confirmed from auth.users u
    where lower(u.email) = normalized and not u.is_sso_user and u.deleted_at is null limit 1;
  if not found then return 'available'::public.registration_email_status; end if;
  if confirmed then return 'registered'::public.registration_email_status; end if;
  return 'confirmation_pending'::public.registration_email_status;
end;
$$;
revoke all on function public.check_registration_email(text) from public;
grant execute on function public.check_registration_email(text) to anon, authenticated;
