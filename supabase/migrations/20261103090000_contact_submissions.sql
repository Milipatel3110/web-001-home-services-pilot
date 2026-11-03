-- WEB-001 contact intake storage
-- SOW section 5.2: contact_submissions, RLS enabled, anonymous direct access denied.
--
-- Apply with either:
--   supabase db push                     (Supabase CLI, linked project)
--   or paste into Dashboard > SQL Editor and run
--
-- Idempotent: safe to run more than once.

create extension if not exists "pgcrypto";

create table if not exists public.contact_submissions (
  request_id  uuid        primary key,
  name        text        not null,
  email       text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);

comment on table public.contact_submissions is
  'WEB-001 demonstration contact enquiries. Written only by the Windmill contact_intake flow using the service role. request_id is supplied by the browser and is the idempotency key.';

-- Defence in depth. The column limits mirror the Edge Function validation, so a
-- payload that somehow bypassed the function still cannot store out-of-range data.
alter table public.contact_submissions
  drop constraint if exists contact_submissions_name_len;
alter table public.contact_submissions
  add constraint contact_submissions_name_len
  check (char_length(name) between 2 and 80);

alter table public.contact_submissions
  drop constraint if exists contact_submissions_email_len;
alter table public.contact_submissions
  add constraint contact_submissions_email_len
  check (char_length(email) between 3 and 254);

alter table public.contact_submissions
  drop constraint if exists contact_submissions_message_len;
alter table public.contact_submissions
  add constraint contact_submissions_message_len
  check (char_length(message) between 10 and 1000);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- RLS is enabled and NO policy is created. With RLS on and no policy, every
-- request that carries the anon or authenticated role is denied for SELECT,
-- INSERT, UPDATE and DELETE. The service_role key used by the Windmill flow
-- bypasses RLS, which is why that key never leaves the server side.
alter table public.contact_submissions enable row level security;

-- force row level security also subjects the table owner to RLS, so a
-- mistaken connection as the owner cannot read the table either.
alter table public.contact_submissions force row level security;

-- Belt and braces: remove the table-level grants PostgREST relies on, so the
-- anon and authenticated roles are refused before RLS is even consulted.
revoke all on public.contact_submissions from anon, authenticated;

-- Drop any policy a previous run may have created.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'contact_submissions'
  loop
    execute format('drop policy %I on public.contact_submissions', pol.policyname);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Verification helpers (run manually; results belong in the T5 evidence)
-- ---------------------------------------------------------------------------
-- Expect rowsecurity = true, forcerowsecurity = true:
--   select relrowsecurity, relforcerowsecurity
--   from pg_class where oid = 'public.contact_submissions'::regclass;
--
-- Expect zero rows:
--   select * from pg_policies
--   where schemaname = 'public' and tablename = 'contact_submissions';
--
-- Expect zero rows (no privileges for anon/authenticated):
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_name = 'contact_submissions'
--     and grantee in ('anon', 'authenticated');
