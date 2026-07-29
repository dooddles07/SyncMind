-- Postgres has two independent security layers: table-level GRANTs (can this role
-- touch the table at all) and row-level RLS policies (which rows can it see).
-- "Automatically expose new tables" was deliberately left off at project creation
-- (docs/ACTIVITY-LOG.md, 2026-07-28) so nothing became queryable before RLS was in
-- place -- but that also means the GRANT layer was never opened, only RLS was
-- (migration ..._rls_policies.sql). Every table-level query was failing with
-- "permission denied" regardless of RLS, confirmed against the live project.
--
-- Fix: grant broadly, let RLS (already enabled on every table) do the actual
-- authorization. This is the standard Supabase model, not a loosening of it --
-- anon has no session, so auth.uid() is null and every "user_id = auth.uid()"
-- policy still evaluates false for it. Table access without a matching row is not
-- data access.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- So the same applies automatically to tables created by future migrations.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
