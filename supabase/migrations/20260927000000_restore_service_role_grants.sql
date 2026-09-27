-- ============================================================
-- Velocewealth · restore service_role table privileges
--
-- Verified against the live project on 27 Sep 2026: the secret API key
-- authenticates as `service_role` (the Auth admin API accepts it) but every
-- table in `public` answers 42501 "permission denied", with Postgres itself
-- hinting `GRANT SELECT ON public.profiles TO service_role`. The `anon` role,
-- meanwhile, can read. So the grants from 20260518000000 are not in force on
-- this project — whether they were never applied or revoked later.
--
-- Why it matters: every server-side write goes through the service role.
-- With no privileges, in production:
--   • the Stripe webhook cannot set profiles.plan_tier → a paying customer
--     stays on the free plan, silently, and the payment is already taken;
--   • pushInAppNotification fails → no reminders at all;
--   • both crons fail on their first query.
-- None of it is visible in the UI, which is why it needs a test after deploy.
--
-- This migration is written as a loop rather than a list so it also covers
-- the tables added since, and can be re-run safely.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    -- service_role is the backend identity: full CRUD, and it bypasses RLS by
    -- design, so RLS policies are not a substitute for these grants.
    execute format('grant all on %I.%I to service_role', r.schemaname, r.tablename);
  end loop;

  for r in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format('grant all on sequence %I.%I to service_role', r.sequence_schema, r.sequence_name);
  end loop;
end $$;

-- New tables created later inherit the grant instead of needing another migration.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Sanity check: fail the migration loudly rather than deploy a broken backend.
do $$
begin
  if not has_table_privilege('service_role', 'public.profiles', 'UPDATE') then
    raise exception 'service_role still cannot UPDATE public.profiles — the Stripe webhook would fail silently';
  end if;
end $$;
