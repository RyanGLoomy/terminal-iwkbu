-- 0020_rls_06_lock_rate_limit_buckets.sql
-- SECURITY PATCH (audit 2026-06): RLS-06.
-- rate_limit_buckets held rate-limit state (key, attempt_count, locked_until)
-- with RLS enabled but no policy, leaving it readable/writable by any client.
-- The table is accessed only via SECURITY DEFINER RPCs (check_rate_limit,
-- record_rate_limit_attempt, clear_rate_limit) which bypass RLS, so deny all
-- direct client access. This prevents cross-user lockout-state leaks and
-- self-unlock attempts.
DROP POLICY IF EXISTS "deny_all_rate_limit_buckets" ON public.rate_limit_buckets;
CREATE POLICY "deny_all_rate_limit_buckets" ON public.rate_limit_buckets
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
