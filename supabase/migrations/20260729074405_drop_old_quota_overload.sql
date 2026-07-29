-- Real correction: the previous migration's own comment claimed "CREATE OR REPLACE
-- allows appending defaulted parameters without breaking existing call sites" --
-- that's wrong. Postgres identifies a function by name + parameter type list, so a
-- changed parameter list creates a second overload rather than replacing the first.
-- Left two increment_usage_daily functions in place, which risks ambiguous
-- resolution when PostgREST's RPC layer picks a candidate by argument names.
-- Verified via pg_proc after applying the previous migration, not assumed correct.
drop function if exists increment_usage_daily(date, integer, integer);
