-- ============================================================
-- DB-backed rate limiting table + atomic RPC functions.
-- Replaces in-memory Map that loses state across serverless instances.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    key            TEXT PRIMARY KEY,
    attempt_count  INTEGER NOT NULL DEFAULT 0,
    locked_until   TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- Tidak ada policy → anon/authenticated tidak bisa akses langsung.
-- Hanya SECURITY DEFINER functions dan service_role yang bisa.

-- check_rate_limit: returns retry_after_seconds (>0) if locked, 0 if allowed.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_locked_until timestamptz;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM rate_limit_buckets
    WHERE key = p_key;

    IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
        RETURN GREATEST(EXTRACT(EPOCH FROM (v_locked_until - now()))::INTEGER, 1);
    END IF;

    RETURN 0;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text) TO anon, authenticated;

-- record_rate_limit_attempt: atomically increments counter, returns retry_after_seconds if locked.
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
    p_key text,
    p_max_attempts integer DEFAULT 5,
    p_lockout_seconds integer DEFAULT 900
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_locked_until timestamptz;
BEGIN
    SELECT attempt_count, locked_until INTO v_count, v_locked_until
    FROM rate_limit_buckets
    WHERE key = p_key
    FOR UPDATE;

    IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
        RETURN GREATEST(EXTRACT(EPOCH FROM (v_locked_until - now()))::INTEGER, 1);
    END IF;

    IF v_count IS NULL THEN
        v_count := 1;
    ELSIF v_locked_until IS NOT NULL AND v_locked_until <= now() THEN
        v_count := 1;
    ELSE
        v_count := COALESCE(v_count, 0) + 1;
    END IF;

    IF v_count >= p_max_attempts THEN
        v_locked_until := now() + make_interval(secs => p_lockout_seconds);
    ELSE
        v_locked_until := NULL;
    END IF;

    INSERT INTO rate_limit_buckets (key, attempt_count, locked_until, updated_at)
    VALUES (p_key, v_count, v_locked_until, now())
    ON CONFLICT (key) DO UPDATE
    SET attempt_count = EXCLUDED.attempt_count,
        locked_until = EXCLUDED.locked_until,
        updated_at = now();

    IF v_locked_until IS NOT NULL THEN
        RETURN GREATEST(EXTRACT(EPOCH FROM (v_locked_until - now()))::INTEGER, 1);
    END IF;

    RETURN 0;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, integer, integer) TO anon, authenticated;

-- clear_rate_limit: resets the bucket after successful attempt.
CREATE OR REPLACE FUNCTION public.clear_rate_limit(p_key text)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM rate_limit_buckets WHERE key = p_key;
$$;
REVOKE EXECUTE ON FUNCTION public.clear_rate_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_rate_limit(text) TO anon, authenticated;
