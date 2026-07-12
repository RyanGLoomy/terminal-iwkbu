-- 0061_round4_perf.sql
-- R4-02 + R4-03 (round 4 review) remediation.
--
-- R4-02. record_rate_limit_attempt: atomic rewrite. The original read-modify-write
--        (SELECT FOR UPDATE -> compute -> INSERT ON CONFLICT) had a TOCTOU on
--        first-attempt row creation: two concurrent first-hit requests both saw
--        no row, both computed v_count := 1, and the ON CONFLICT wrote
--        attempt_count = 1 instead of 2. Collapsed to a single
--        INSERT ... ON CONFLICT DO UPDATE ... RETURNING so the increment is
--        serialized on the row lock. Return contract (integer: 0 = not locked,
--        >0 = seconds remaining) and parameter defaults are preserved; the TS
--        caller (src/lib/auth/rate-limiter.ts recordFailedAttempt) needs no changes.
--
-- R4-03. Three covering indexes for dashboard top-N / sort patterns. Structural,
--        based on query shapes in src/lib/supabase/queries (not usage stats, which
--        are unreliable on a zero-row DB):
--        - iwkbu_sync_status.last_synced_at: staf-iw dashboard recent-sync list
--          ORDER BY last_synced_at DESC (iwkbu-sync.server.ts).
--        - iwkbu_sync_runs.started_at: sync-run history ORDER BY started_at DESC
--          LIMIT 20.
--        - findings (po_id, created_at DESC): getPoFindings serves PO-equality +
--          created_at sort; existing (po_id, status) does not cover the sort
--          order, so the two composites serve distinct real query shapes.

-- R4-02. Atomic rate-limit attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  p_key text, p_max_attempts integer DEFAULT 5, p_lockout_seconds integer DEFAULT 900
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_locked_until timestamptz;
  v_new_count integer;
BEGIN
  -- Fast path: if currently locked, return remaining seconds without mutating.
  SELECT locked_until INTO v_locked_until
  FROM rate_limit_buckets
  WHERE key = p_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN GREATEST(EXTRACT(EPOCH FROM (v_locked_until - now()))::integer, 1);
  END IF;

  -- Atomic upsert. The ON CONFLICT branch acquires the row lock and serializes
  -- concurrent callers, so attempt_count is incremented exactly once per call.
  -- Reset to 1 when the previous lockout just expired; otherwise increment.
  INSERT INTO rate_limit_buckets (key, attempt_count, locked_until, updated_at)
  VALUES (p_key, 1, NULL, now())
  ON CONFLICT (key) DO UPDATE
    SET attempt_count = CASE
          WHEN rate_limit_buckets.locked_until IS NOT NULL
               AND rate_limit_buckets.locked_until <= now()
            THEN 1
          ELSE rate_limit_buckets.attempt_count + 1
        END,
        locked_until = NULL,
        updated_at = now()
  RETURNING attempt_count INTO v_new_count;

  -- Threshold reached -> set lockout and return remaining seconds. The row is
  -- still locked from the upsert above within this transaction.
  IF v_new_count >= p_max_attempts THEN
    UPDATE rate_limit_buckets
      SET locked_until = now() + make_interval(secs => p_lockout_seconds),
          updated_at = now()
      WHERE key = p_key
      RETURNING locked_until INTO v_locked_until;
    RETURN GREATEST(EXTRACT(EPOCH FROM (v_locked_until - now()))::integer, 1);
  END IF;

  RETURN 0;
END;
$$;

-- R4-03. Covering indexes for dashboard query patterns
CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_status_last_synced
  ON public.iwkbu_sync_status (last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_iwkbu_sync_runs_started_at
  ON public.iwkbu_sync_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_findings_po_created
  ON public.findings (po_id, created_at DESC);
